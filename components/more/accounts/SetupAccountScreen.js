import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, deleteDoc,setDoc} from "firebase/firestore";
import { db } from "../../../config/firebase-config";
import { TrackerContext } from "../../context/TrackerContext";

export default function SetupAccountScreen({ navigation, route }) {
  const { trackerId, trackerName, userId, isGuest,isShared} = useContext(TrackerContext); 
  const { account, type } = route.params || {};
  const isEditing = !!account;

  const [selectedType, setSelectedType] = useState(type || "Cash");
  const [name, setName] = useState(account?.name || "");
  const [amount, setAmount] = useState(account?.amount?.toString() || "");
  const [currencySymbol, setCurrencySymbol] = useState("₱");
  const types = ["Cash", "Banks", "E-Wallets"];

    useEffect(() => {
    AsyncStorage.getItem("selectedCurrency")
      .then((res) => {
        if (res) setCurrencySymbol(JSON.parse(res).symbol || "₱");
      })
      .catch(console.error);
  }, []);


  // ---------- Fetch saved currency ----------
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("currencyChanged", (newCurrency) => {
      setCurrencySymbol(newCurrency.symbol); // updates immediately
    });

    return () => subscription.remove();
  }, []);

/** ---------- Save account ---------- */
const handleUpdate = async () => {
  if (!name.trim() || !amount.trim()) {
    Alert.alert("Validation", "Please enter all fields.");
    return;
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    Alert.alert("Validation", "Amount must be a number.");
    return;
  }

  const accId = isEditing ? account.id : `acc_${Date.now()}`;
  const oldType = isEditing ? (account.type || type) : selectedType;

  const newAcc = {
    id: accId,
    name: name.trim(),
    type: selectedType,
    amount: parsedAmount,
    updatedAt: Date.now(),
  };

  try {
    if (isGuest) {
      // Guest users (AsyncStorage)
      if (isEditing && oldType !== selectedType) {
        const oldKey = `guest_${trackerId}_${oldType}`;
        const rawOld = await AsyncStorage.getItem(oldKey);
        let oldAccounts = rawOld ? JSON.parse(rawOld) : [];
        oldAccounts = oldAccounts.filter(a => a.id !== accId);
        await AsyncStorage.setItem(oldKey, JSON.stringify(oldAccounts));
        DeviceEventEmitter.emit("guestAccountsUpdated", { type: oldType, updatedAccounts: oldAccounts });
      }

      const key = `guest_${trackerId}_${selectedType}`;
      const raw = await AsyncStorage.getItem(key);
      let accountsArr = raw ? JSON.parse(raw) : [];
      accountsArr = [...accountsArr.filter(a => a.id !== accId), newAcc];
      await AsyncStorage.setItem(key, JSON.stringify(accountsArr));
      DeviceEventEmitter.emit("guestAccountsUpdated", { type: selectedType, updatedAccounts: accountsArr });

      // Send only updated account back
      route.params?.onUpdate?.({ oldType, newType: selectedType, updatedAccount: newAcc });

    } else {
      // Firebase users
      const isShared = trackerId !== "personal";
      const collectionPath = isShared
        ? ["sharedTrackers", trackerId, selectedType]
        : ["users", userId, "trackers", trackerId, selectedType];

      if (isEditing && oldType !== selectedType) {
        const oldPath = isShared
          ? ["sharedTrackers", trackerId, oldType, accId]
          : ["users", userId, "trackers", trackerId, oldType, accId];
        await deleteDoc(doc(db, ...oldPath));
      }

      const ref = doc(db, ...collectionPath, accId);
      await setDoc(ref, newAcc, { merge: true });

      // Clear offline queue for this account
      const queueKey = `offlineQueue_${trackerId}_${selectedType}`;
      const queueJson = await AsyncStorage.getItem(queueKey);
      let queue = queueJson ? JSON.parse(queueJson) : [];
      queue = queue.filter(item => item.payload.id !== accId);
      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));

      route.params?.onUpdate?.({ oldType, newType: selectedType, updatedAccount: newAcc });
    }

    Alert.alert("Success", "Account saved!");
    navigation.goBack();
  } catch (err) {
    console.error("Failed to save account:", err);
    Alert.alert("Error", "Could not save account.");
  }
};





/** ---------- Delete account ---------- */
const handleDelete = async () => {
  if (!isEditing) return;
  const accId = account?.id;

  Alert.alert("Confirm Delete", "Are you sure you want to delete this account?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        try {
          if (isGuest) {
            // Guest: remove from AsyncStorage
            const key = `guest_${trackerId}_${selectedType}`;
            const raw = await AsyncStorage.getItem(key);
            let accountsArr = raw ? JSON.parse(raw) : [];
            accountsArr = accountsArr.filter(a => a.id !== accId);
            await AsyncStorage.setItem(key, JSON.stringify(accountsArr));
            DeviceEventEmitter.emit("guestAccountsUpdated", { type: selectedType, updatedAccounts: accountsArr });

          } else {
            // Firebase: remove from correct type collection
            const isShared = trackerId !== "personal";
            const refPath = isShared
              ? ["sharedTrackers", trackerId, selectedType, accId] // shared
              : ["users", userId, "trackers", trackerId, selectedType, accId]; // personal

            const ref = doc(db, ...refPath);
            await deleteDoc(ref);

            // Optionally: remove from offline queue
            const queueKey = `offlineQueue_${trackerId}_${selectedType}`;
            const queueJson = await AsyncStorage.getItem(queueKey);
            let queue = queueJson ? JSON.parse(queueJson) : [];
            queue = queue.filter(item => item.payload.id !== accId);
            await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
          }
          navigation.goBack();
        } catch (err) {
          console.error("Failed to delete account:", err);
          Alert.alert("Error", "Could not delete account.");
        }
      },
    },
  ]);
};





  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? "Edit" : "Set up"} {selectedType}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.trackertype}>{trackerName}</Text>

      <View style={styles.content}>
        <Text style={styles.groupLabel}>Group</Text>
        <View style={styles.tabContainer}>
          {types.map(t => (
            <TouchableOpacity key={t} style={[styles.tab, selectedType === t && styles.selectedTab]} onPress={() => setSelectedType(t)}>
              <Text style={[styles.tabText, selectedType === t && styles.selectedTabText]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Enter account name" style={styles.bottomInput} />

        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountInputWrapper}>
          <Text style={styles.currencyIcon}>{currencySymbol}</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="Enter amount" keyboardType="numeric" style={styles.amountInput} />
        </View>

        <View style={[styles.buttonsRow, { justifyContent: "flex-start", alignItems: "center" }]}>
          {isEditing && (
            <TouchableOpacity style={{ backgroundColor: "#A4C0CF", width: 40, height: 40, borderRadius: 4, justifyContent: "center", alignItems: "center", marginRight: 12 }} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#145C84" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.saveButton, { flex: 1 }]} onPress={handleUpdate}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerBackground: {
    height: 100,
    width: "100%",
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
  content: { paddingHorizontal: 16 },
  groupLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#386681",
    marginBottom: 8,
  },
  tabContainer: { flexDirection: "row", marginBottom: 20 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: "#eee",
    marginRight: 10,
  },
  selectedTab: { backgroundColor: "#89C3E6" },
  tabText: { fontSize: 14, color: "#333" },
  selectedTabText: { color: "#EBF8FF", fontWeight: "bold" },
  label: { fontSize: 14, color: "#386681", marginBottom: 6, fontWeight: "bold" },
  bottomInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    marginBottom: 20,
  },
  amountInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 20,
  },
  currencyIcon: { fontSize: 16, marginRight: 6, color: "#333" },
  amountInput: { flex: 1, paddingVertical: 8 },
  buttonsRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  saveButton: {
    flex: 1,
    backgroundColor: "#145C84",
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  saveText: { color: "#F7F2B3", fontWeight: "600", fontSize: 16 },
});
