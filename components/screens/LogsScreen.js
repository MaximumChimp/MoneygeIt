import React, { useState, useCallback, useContext, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { TrackerContext } from "../context/TrackerContext";
import { collection, getDocs, query, orderBy,onSnapshot} from "firebase/firestore";
import { db } from "../../config/firebase-config";
import NetInfo from "@react-native-community/netinfo";

export default function LogsScreen() {
  const navigation = useNavigation();
  const { trackerId, trackerName, userId, isGuest, mode } = useContext(TrackerContext);

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filter, setFilter] = useState("Daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("₱");
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const filters = ["Daily", "Weekly", "Monthly", "Yearly"];
  const subHeaderText = isGuest
    ? "Guest Tracker"
    : trackerId === "personal"
    ? "Personal Budget Tracker"
    : trackerName || "Shared Tracker";

  /** ---------------- Refresh Handler ---------------- */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      let docs = [];

      if (isGuest || !isConnected) {
        const stored = await AsyncStorage.getItem(`guest_${trackerId}_transactions`);
        if (stored) docs = JSON.parse(stored).sort((a, b) => b.timestamp - a.timestamp);
      } else {
        const pathBase =
          mode === "personal"
            ? ["users", userId, "trackers", trackerId, "transactions"]
            : ["sharedTrackers", trackerId, "transactions"];

        const q = query(collection(db, ...pathBase), orderBy("timestamp", "desc"));
        const querySnap = await getDocs(q);
        docs = querySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Cache locally
        await AsyncStorage.setItem(`guest_${trackerId}_transactions`, JSON.stringify(docs));
      }

      setTransactions(docs);
      applyFilter(docs, filter, selectedDate);
    } catch (err) {
      console.error("Error refreshing transactions:", err);
    } finally {
      setRefreshing(false);
    }
  }, [isGuest, trackerId, userId, mode, filter, isConnected, selectedDate]);

  /** ---------------- Network Monitoring ---------------- */
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = NetInfo.addEventListener((state) => {
        setIsConnected(state.isConnected && state.isInternetReachable);
      });
      return () => unsubscribe();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      // When screen is focused: do nothing or load data
      return () => {
        // When screen loses focus, reset date and filter
        setSelectedDate(new Date());   // reset to today
        setFilter("Daily");            // reset to default tab
      };
    }, [])
  );

  /** ---------------- Load Currency & Transactions ---------------- */
  useFocusEffect(
    useCallback(() => {
      let unsubscribe = null;

      const initializeScreen = async () => {
        setLoading(true);

        // Load currency symbol
        try {
          const savedCurrency = await AsyncStorage.getItem("selectedCurrency");
          if (savedCurrency) {
            setCurrencySymbol(JSON.parse(savedCurrency).symbol);
          }
        } catch (err) {
          console.error("Failed to fetch currency symbol:", err);
        }

        if (isGuest || !isConnected) {
          // Guest / offline mode
          try {
            const stored = await AsyncStorage.getItem(`guest_${trackerId}_transactions`);
            const docs = stored
              ? JSON.parse(stored).sort((a, b) => b.timestamp - a.timestamp)
              : [];
            setTransactions(docs);
            applyFilter(docs, filter, selectedDate);
          } catch (err) {
            console.error("Error loading guest transactions:", err);
          } finally {
            setLoading(false);
          }
        } else {
          // Real-time listener for personal or shared trackers
          try {
            const pathBase =
              mode === "personal"
                ? ["users", userId, "trackers", trackerId, "transactions"]
                : ["sharedTrackers", trackerId, "transactions"];

            const q = query(collection(db, ...pathBase), orderBy("timestamp", "desc"));

            unsubscribe = onSnapshot(
              q,
              async (snapshot) => {
                const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setTransactions(docs);
                applyFilter(docs, filter, selectedDate);

                // Cache locally for offline / guest
                await AsyncStorage.setItem(`guest_${trackerId}_transactions`, JSON.stringify(docs));
                setLoading(false);
              },
              (err) => {
                console.error("Error fetching transactions:", err);
                setTransactions([]);
                setFilteredTransactions([]);
                setLoading(false);
              }
            );
          } catch (err) {
            console.error("Error initializing listener:", err);
            setLoading(false);
          }
        }
      };

      initializeScreen();

      // Cleanup on unfocus
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [isGuest, trackerId, userId, mode, filter, isConnected, selectedDate])
  );


  /** ---------------- Filtering Logic ---------------- */
  const applyFilter = (data, range, baseDate) => {
    const now = baseDate || new Date();
    const filtered = data.filter((item) => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);

      switch (range) {
        case "Daily":
          return itemDate.toDateString() === now.toDateString();
        case "Weekly":
          return getWeekNumber(itemDate) === getWeekNumber(now) && itemDate.getFullYear() === now.getFullYear();
        case "Monthly":
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        case "Yearly":
          return itemDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
    setFilteredTransactions(filtered);
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  const formatDateLabel = (filterType, date) => {
    if (!date) return "";
    switch (filterType) {
      case "Daily":
        return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      case "Weekly":
        return `Week ${getWeekNumber(date)}, ${date.getFullYear()}`;
      case "Monthly":
        return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      case "Yearly":
        return `${date.getFullYear()}`;
      default:
        return date.toLocaleDateString();
    }
  };

  /** ---------------- Date Navigation ---------------- */
  const changeDate = (direction) => {
    const newDate = new Date(selectedDate);
    switch (filter) {
      case "Daily": newDate.setDate(newDate.getDate() + direction); break;
      case "Weekly": newDate.setDate(newDate.getDate() + direction * 7); break;
      case "Monthly": newDate.setMonth(newDate.getMonth() + direction); break;
      case "Yearly": newDate.setFullYear(newDate.getFullYear() + direction); break;
    }
    setSelectedDate(newDate);
    applyFilter(transactions, filter, newDate);
  };

  /** ---------------- Render Transaction ---------------- */
  const renderItem = ({ item }) => {
    let amountColor = "#888";
    if (item.type === "Income") amountColor = "#0076CA";
    else if (item.type === "Expenses") amountColor = "#E98898";
    else if (item.type === "Transfer") amountColor = "#999999";

    return (
      <TouchableOpacity onPress={() => navigation.navigate("EditLogScreen", { id: item.id })}>
        <View style={styles.card}>
          <View style={styles.left}>
            {item.type === "Transfer" ? (
              <>
                <Text style={styles.category}>Transfer from: {item.from?.name || "N/A"}</Text>
                <Text style={styles.subcategory}>Transfer to: {item.to?.name || "N/A"}</Text>
              </>
            ) : (
              <>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.subcategory}>{item.subcategory}</Text>
              </>
            )}
          </View>
          <View style={styles.right}>
            <Text style={[styles.transactionAmount, { color: amountColor }]}>
              {currencySymbol} {Number(item.amount).toFixed(2)}
            </Text>
            <Text style={styles.date}>
              {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /** ---------------- Summary ---------------- */
  const calculateTotal = (type) => {
    if (!isConnected && !isGuest) return "0.00";
    let income = 0, expense = 0, transfer = 0;
    filteredTransactions.forEach((item) => {
      const t = item.type.toLowerCase();
      if (t === "income") income += Number(item.amount);
      else if (t === "expenses") expense += Number(item.amount);
      else if (t === "transfer") transfer += Number(item.amount);
    });
    switch (type) {
      case "income": return income.toFixed(2);
      case "expense": return expense.toFixed(2);
      case "transfer": return transfer.toFixed(2);
      case "total": return (income - expense).toFixed(2);
      default: return "0.00";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}><Text style={styles.headerText}>Logs</Text></View>
      <Text style={styles.subHeader}>{subHeaderText}</Text>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.activeFilterBtn]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date navigation */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={{ marginHorizontal: 10 }}>
          <Ionicons name="chevron-back-outline" size={24} color="#145C84" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>{formatDateLabel(filter, selectedDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDate(1)} style={{ marginHorizontal: 10 }}>
          <Ionicons name="chevron-forward-outline" size={24} color="#145C84" />
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) {
              setSelectedDate(date);
              applyFilter(transactions, filter, date);
            }
          }}
        />
      )}

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}><Text style={[styles.summaryLabel, { color: "#CFE7DC" }]}>Income</Text><Text style={[styles.summaryValue, { color: "#CFE7DC" }]}>{currencySymbol} {calculateTotal("income")}</Text></View>
        <View style={styles.summaryItem}><Text style={[styles.summaryLabel, { color: "#FFB8B8" }]}>Expenses</Text><Text style={[styles.summaryValue, { color: "#E98898" }]}>{currencySymbol} {calculateTotal("expense")}</Text></View>
        <View style={styles.summaryItem}><Text style={[styles.summaryLabel, { color: "#FFF7C2" }]}>Total</Text><Text style={[styles.summaryValue, { color: "#F7F2B3" }]}>{currencySymbol} {calculateTotal("total")}</Text></View>
      </View>

    {/* Transactions */}
    {(loading || refreshing) ? (
      // Show skeleton
      <View>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={[styles.card, { backgroundColor: "#e0e0e0" }]}>
            <View style={{ height: 25, backgroundColor: "#ccc", marginBottom: 6, borderRadius: 4 }} />
            <View style={{ height: 14, backgroundColor: "#ccc", borderRadius: 4 }} />
          </View>
        ))}
      </View>
    ) : !isConnected && !isGuest ? (
      <Text style={styles.fallbackText}>No internet connection. Please check your network.</Text>
    ) : filteredTransactions.length === 0 ? (
      <Text style={styles.fallbackText}>No transactions in your history yet.</Text>
    ) : (
      <FlatList
        contentContainerStyle={{ paddingTop: 10 }}
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerBackground: { height: 100, width: "100%", backgroundColor: "#145C84", justifyContent: "flex-end", alignItems: "center", paddingBottom: 12 },
  headerText: { fontSize: 16, fontWeight: "bold", color: "#A4C0CF" },
  subHeader: { fontSize: 14, fontWeight: "600", color: "#6FB5DB", textAlign: "center", paddingVertical: 10, backgroundColor: "#EDEDEE", marginBottom: 15 },
  filterRow: { flexDirection: "row", justifyContent: "space-evenly", paddingVertical: 10, paddingHorizontal: 10 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 15, backgroundColor: "#e0e0e0", borderRadius: 4 },
  activeFilterBtn: { backgroundColor: "#89C3E6" },
  filterText: { fontSize: 14, color: "#707C83" },
  activeFilterText: { color: "#fff", fontWeight: "bold" },
  dateRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginVertical: 10, gap: 10 },
  dateText: { fontSize: 16, fontWeight: "500", color: "#145C84" },
  fallbackText: { fontSize: 13, color: "#999", marginTop: 8, marginLeft: 26 },
  summaryCard: { backgroundColor: "#145C84", borderRadius: 8, marginHorizontal: 20, marginBottom: 10, marginVertical: 10, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryItem: { alignItems: "center" },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 16, fontWeight: "bold" },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FBFDFF", padding: 12, marginHorizontal: 16, marginVertical: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  left: { flexDirection: "column" },
  transactionAmount: { fontSize: 15 },
  category: { fontSize: 16, fontWeight: "bold", color: "#333" },
  subcategory: { fontSize: 14, color: "#666", marginTop: 2 },
  right: { alignItems: "flex-end" },
  date: { fontSize: 13, color: "#B4BCC0", marginTop: 2 },
});
