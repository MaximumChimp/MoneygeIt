import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { TrackerContext } from "../context/TrackerContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../config/firebase-config";
import { collection, onSnapshot } from "firebase/firestore";

export default function AccountsScreen({ navigation }) {
  const accountTypes = ["Cash", "Banks", "E-Wallets"];
  const { trackerId, trackerName, userId, mode, isGuest } = useContext(TrackerContext);

  const [accounts, setAccounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState("₱");
  const [currentTrackerName, setCurrentTrackerName] = useState(trackerName);
  const [totalAssets, setTotalAssets] = useState(0);
  const OFFLINE_QUEUE_PREFIX = `offlineQueue_${trackerId}_`;

  // ---------- Load saved currency ----------
  useEffect(() => {
    AsyncStorage.getItem("selectedCurrency")
      .then(res => res && setCurrencySymbol(JSON.parse(res).symbol || "₱"))
      .catch(console.error);
  }, []);

  // ---------- Currency change listener ----------
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("currencyChanged", (newCurrency) => {
      setCurrencySymbol(newCurrency.symbol);
    });
    return () => subscription.remove();
  }, []);

  // ---------- Guest updates listener ----------
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("guestAccountsUpdated", ({ type, updatedAccounts }) => {
      setAccounts(prev => {
        const updated = { ...prev, [type]: updatedAccounts };
        recalcTotal(updated);
        return updated;
      });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!trackerId) return;

    // ---------- Guest Mode ----------
    if (isGuest || mode === "guest" || !userId) {
      setLoading(true);
      const fetchGuestAccounts = async () => {
        const guestData = {};
        for (const type of accountTypes) {
          const key = `guest_${trackerId}_${type}`;
          const json = await AsyncStorage.getItem(key);
          guestData[type] = json ? JSON.parse(json) : [];
        }
        setAccounts(guestData);
        recalcTotal(guestData);
        setLoading(false);
      };
      fetchGuestAccounts();
      const interval = setInterval(fetchGuestAccounts, 1000);
      return () => clearInterval(interval);
    }

    // ---------- Personal / Shared Mode ----------
    const pathBase = mode === "personal"
      ? ["users", userId, "trackers", trackerId]
      : ["sharedTrackers", trackerId];

    const unsubscribers = [];

    // --- Listen to accounts ---
    accountTypes.forEach(type => {
      const ref = collection(db, ...pathBase, type);
      const unsub = onSnapshot(ref, async snapshot => {
        let liveAccounts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Merge offline queued updates
        const queueKey = `${OFFLINE_QUEUE_PREFIX}${type}`;
        const queueJson = await AsyncStorage.getItem(queueKey);
        const queue = queueJson ? JSON.parse(queueJson) : [];
        queue.forEach(item => {
          if (item.action === "add") liveAccounts.push(item.payload);
          if (item.action === "update") {
            const idx = liveAccounts.findIndex(a => a.id === item.payload.id);
            if (idx !== -1) liveAccounts[idx] = { ...liveAccounts[idx], ...item.payload };
          }
          if (item.action === "delete") {
            liveAccounts = liveAccounts.filter(a => a.id !== item.payload.id);
          }
        });

        setAccounts(prev => {
          const updated = { ...prev, [type]: liveAccounts };
          recalcTotal(updated);
          return updated;
        });
        setLoading(false);
      }, err => console.error(`Account listener error (${type}):`, err));
      unsubscribers.push(unsub);
    });

    // --- Listen to transactions for display only ---
    const txRef = collection(db, ...pathBase, "transactions");
    const unsubTransactions = onSnapshot(txRef, snapshot => {
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched transactions:", transactions);
      // No balance recalculation here, just optional UI usage if needed
    }, err => console.error("Transaction listener failed:", err));

    unsubscribers.push(unsubTransactions);

    setCurrentTrackerName(trackerName || "Personal/Shared Tracker");

    return () => unsubscribers.forEach(u => u());
  }, [trackerId, userId, mode, trackerName, isGuest]);

  // ---------- Compute total assets ----------
  const recalcTotal = accs => {
    const total = Object.values(accs)
      .flat()
      .reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    setTotalAssets(total);
  };

  const getTypeTotal = type => {
    const list = Array.isArray(accounts[type]) ? accounts[type] : [];
    return list.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  };

  const formatCurrency = amount => {
    const num = parseFloat(amount || 0);
    return `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getAmountColor = amount => (parseFloat(amount) < 0 ? "#E98898" : "#0076CA");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <Text style={styles.headerText}>Accounts</Text>
      </View>

      {currentTrackerName && <Text style={styles.trackertype}>{currentTrackerName}</Text>}

      <View style={styles.totalAssetsCard}>
        <Text style={styles.totalAssetsLabel}>Total Assets</Text>
        <Text style={[styles.totalAssetsValue, { color: "#91D1FF" }]}>{formatCurrency(totalAssets)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {accountTypes.map(type => {
          const list = Array.isArray(accounts[type]) ? accounts[type] : [];
          const typeTotal = getTypeTotal(type);
          return (
            <View key={type} style={styles.typeSection}>
              <View style={styles.typeRowFull}>
                <Text style={styles.typeTextFull}>{type}</Text>
                <Text style={[styles.typeTotalText, { color: getAmountColor(typeTotal) }]}>{formatCurrency(typeTotal)}</Text>
              </View>

              {loading ? (
                <ActivityIndicator size="small" color="#145C84" style={{ marginTop: 10 }} />
              ) : list.length === 0 ? (
                <Text style={styles.fallbackText}>No accounts yet.</Text>
              ) : (
                list.map(acc => (
                  <View key={acc.id || acc.name} style={styles.accountItem}>
                    <View style={styles.accountRow}>
                      <Text style={styles.accountText}>{acc.name}</Text>
                      <Text style={[styles.accountText, { color: getAmountColor(acc.amount) }]}>{formatCurrency(acc.amount)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerBackground: { height: 100, backgroundColor: "#145C84", justifyContent: "flex-end", alignItems: "center", paddingBottom: 12 },
  headerText: { fontSize: 16, fontWeight: "bold", color: "#A4C0CF" },
  trackertype: { fontWeight: "bold", color: "#6FB5DB", fontSize: 14, textAlign: "center", padding: 10, backgroundColor: "#EDEDEE", marginBottom: 15 },
  totalAssetsCard: { backgroundColor: "#145C84", padding: 20, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalAssetsLabel: { fontSize: 16, color: "#F7F2B3" },
  totalAssetsValue: { fontSize: 16, fontWeight: "bold" },
  typeSection: { marginBottom: 16, width: "100%" },
  typeRowFull: { backgroundColor: "#f2f2f2", borderRadius: 8, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 16 },
  typeTextFull: { fontSize: 14, fontWeight: "bold", color: "#19445C" },
  typeTotalText: { fontSize: 14, fontWeight: "bold" },
  fallbackText: { fontSize: 13, color: "#999", marginTop: 8, marginLeft: 16 },
  accountItem: { marginTop: 8, marginHorizontal: 16, paddingVertical: 6 },
  accountRow: { flexDirection: "row", justifyContent: "space-between" },
  accountText: { fontSize: 14, color: "#19445C" },
});
