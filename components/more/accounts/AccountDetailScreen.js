import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TrackerContext } from "../../context/TrackerContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../../config/firebase-config";
import { collection, onSnapshot } from "firebase/firestore";

export default function AccountDetailScreen({ navigation }) {
  const accountTypes = ["Cash", "Banks", "E-Wallets"];
  const { trackerId, trackerName, userId, mode, isGuest } = useContext(TrackerContext);

  const [accounts, setAccounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTrackerName, setCurrentTrackerName] = useState(trackerName);

  const OFFLINE_QUEUE_PREFIX = `offlineQueue_${trackerId}_`;
  
  /** ---------- DeviceEventEmitter for guest updates ---------- */
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "guestAccountsUpdated",
      ({ type, updatedAccounts }) => {
        setAccounts(prev => ({ ...prev, [type]: updatedAccounts }));
      }
    );
    return () => subscription.remove();
  }, []);

  /** ---------- Load accounts (guest or Firestore) ---------- */
  useEffect(() => {
    if (!trackerId) return;

    const fetchGuestAccounts = async () => {
      setLoading(true);
      try {
        const guestData = {};
        for (const type of accountTypes) {
          const key = `guest_${trackerId}_${type}`;
          const json = await AsyncStorage.getItem(key);
          guestData[type] = json ? JSON.parse(json) : [];
        }
        setAccounts(guestData);
        setCurrentTrackerName(trackerName || "Guest Tracker");
      } catch (err) {
        console.error("Failed to load guest accounts:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isGuest || mode === "guest" || !userId) {
      fetchGuestAccounts();
      return;
    }

    // Firestore listeners
    const pathBase = mode === "personal"
      ? ["users", userId, "trackers", trackerId]
      : ["sharedTrackers", trackerId];

    setLoading(true);
    const unsubs = accountTypes.map(type => {
      const ref = collection(db, ...pathBase, type);
      return onSnapshot(
        ref,
        async snapshot => {
          let liveAccounts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          // Merge offline queued changes
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

          setAccounts(prev => ({ ...prev, [type]: liveAccounts }));
          setLoading(false);
        },
        err => {
          console.error(`Account listener error (${type}):`, err);
          setLoading(false);
        }
      );
    });

    setCurrentTrackerName(trackerName);
    return () => unsubs.forEach(u => u());
  }, [trackerId, userId, mode, trackerName, isGuest]);

  /** ---------- Navigate to EditAccountScreen ---------- */
  const handleEditAccount = type => {
    navigation.navigate("EditAccountScreen", { type });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Accounts</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {currentTrackerName && (
        <Text style={styles.trackertype}>{currentTrackerName}</Text>
      )}

<ScrollView contentContainerStyle={styles.content}>
  {accountTypes.map(type => {
    const accountList = Array.isArray(accounts[type]) ? accounts[type] : [];

    return (
      <View key={type} style={styles.typeSection}>
        <View style={styles.typeRowFull}>
          <Text style={styles.typeTextFull}>{type}</Text>
          <TouchableOpacity onPress={() => handleEditAccount(type)}>
            <Ionicons name="create-outline" size={20} color="#145C84" marginRight="20" />
          </TouchableOpacity>
        </View>



        {loading ? (
          <ActivityIndicator size="small" color="#145C84" style={{ marginTop: 10 }} />
        ) : accountList.length === 0 ? (
          <Text style={styles.fallbackText}>No accounts yet.</Text>
        ) : (
          accountList.map(acc => (
            <TouchableOpacity
              key={acc.id || acc.name}
              style={styles.accountItem}
              onPress={() =>
                navigation.navigate("SetupAccountScreen", {
                  account: acc,
                  type,
                  accountId: acc.id,
                  isGuest,
                  onUpdate: ({ oldType, newType, updatedAccount }) => {
                    setAccounts(prev => {
                      const newState = { ...prev };

                      // Remove from old type if necessary
                      if (oldType && oldType !== newType) {
                        newState[oldType] = (newState[oldType] || []).filter(a => a.id !== updatedAccount.id);
                      }

                      // Merge/update into the new type
                      const typeArr = newState[newType] || [];
                      const idx = typeArr.findIndex(a => a.id === updatedAccount.id);

                      if (idx !== -1) {
                        // Update existing account
                        typeArr[idx] = { ...typeArr[idx], ...updatedAccount };
                      } else {
                        // Add new account
                        typeArr.push(updatedAccount);
                      }

                      newState[newType] = typeArr;

                      return newState;
                    });
                  }

                })
              }
            >
              <Text style={styles.accountText}>{acc.name}</Text>
            </TouchableOpacity>
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
  headerBackground: {
    height: 100,
    backgroundColor: "#145C84",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#A4C0CF" },
  trackertype: {
    fontWeight: "bold",
    color: "#6FB5DB",
    fontSize: 14,
    textAlign: "center",
    padding: 10,
    backgroundColor: "#EDEDEE",
    marginBottom: 15,
  },
  content: { paddingBottom: 32 },
  typeSection: { marginBottom: 16, width: "100%" },
  typeRow: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeText: { fontSize: 14, color: "#19445C", fontWeight: "bold" },
  fallbackText: { fontSize: 13, color: "#999", marginTop: 8, marginLeft: 36 },
  accountItem: { marginTop: 8, marginLeft: 16, paddingVertical: 6, borderRadius: 6 },
  accountText: { fontSize: 14, color: "#386681" , marginLeft: 20 },
typeRowFull: {
  backgroundColor: "#f2f2f2",
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 5,   // remove horizontal padding
  flexDirection: "row",
  alignItems: "center",
  width: "100%",           // full width
},

typeTextFull: {
  flex: 1,                 // stretch to fill row
  fontSize: 14,
  fontWeight: "bold",
  color: "#19445C",
  paddingHorizontal: 16,   // optional: same padding as subheader
},

});
