import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  Alert, Platform, Modal, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TimeInput from '../components/TimeInput';
import { useTheme } from '../contexts/ThemeContext';
const NotificationService = require('../services/SuperNotificationService');

// ─────────────────────────────────────────────────────────────────────
// Helper: time-picker modale riutilizzabile
// ─────────────────────────────────────────────────────────────────────
const TimePicker = ({ visible, value, onConfirm, onCancel, theme }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 14, padding: 20 }}>
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>Orario (HH:mm)</Text>
            <TimeInput
              value={value}
              onChange={(t) => { if (t && t.length === 5) onConfirm(t); }}
              inputStyle={{
                backgroundColor: theme.dark ? 'rgba(255,255,255,0.07)' : '#fff',
                color: theme.colors.text, borderColor: theme.colors.border,
                fontSize: 18, paddingVertical: 12,
              }}
            />
            <TouchableOpacity onPress={onCancel} style={{ alignSelf: 'flex-end', marginTop: 12 }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────
// Componente principale
// ─────────────────────────────────────────────────────────────────────
const NotificationSettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const s = createStyles(theme);

  // Stato
  const [enabled, setEnabled]             = useState(false);
  const [hasPermission, setHasPerm]       = useState(false);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  // Promemoria inserimento orari
  const [terEnabled, setTerEnabled]       = useState(false);
  const [terTime, setTerTime]             = useState('18:30');
  const [terWeekend, setTerWeekend]       = useState(false);

  // Promemoria reperibilità
  const [sbrEnabled, setSbrEnabled]       = useState(false);
  const [sbrNotifs, setSbrNotifs]         = useState([
    { daysInAdvance: 0, enabled: true,  time: '07:30', message: 'Turno di reperibilità oggi' },
    { daysInAdvance: 1, enabled: true,  time: '20:00', message: 'Turno di reperibilità domani' },
  ]);

  // Time picker
  const [picker, setPicker] = useState({ visible: false, value: '08:00', onConfirm: null });
  const openPicker = (currentVal, onConfirm) => setPicker({ visible: true, value: currentVal, onConfirm });

  // ── load ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const perm = await NotificationService.hasPermissions();
        setHasPerm(perm);
        const raw = await NotificationService.getSettings();
        if (raw) {
          setEnabled(!!raw.enabled);
          const ter = raw.timeEntryReminder || {};
          setTerEnabled(!!ter.enabled);
          setTerTime(ter.time || '18:30');
          setTerWeekend(!!ter.weekendsEnabled);
          const sbr = raw.standbyReminder || {};
          setSbrEnabled(!!sbr.enabled);
          if (Array.isArray(sbr.notifications) && sbr.notifications.length > 0)
            setSbrNotifs(sbr.notifications);
        }
      } catch (e) {
        console.error('NotificationSettings load:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── permessi ──────────────────────────────────────────────────────
  const requestPerm = async () => {
    const ok = await NotificationService.requestPermissions();
    setHasPerm(ok);
    if (!ok)
      Alert.alert('Permessi necessari', 'Abilita le notifiche nelle impostazioni del telefono.');
    return ok;
  };

  const handleMainToggle = async (val) => {
    if (val && !hasPermission) {
      const ok = await requestPerm();
      if (!ok) return;
    }
    setEnabled(val);
  };

  // ── aggiorna singola notifica reperibilità ────────────────────────
  const patchSbrNotif = (idx, patch) =>
    setSbrNotifs(prev => prev.map((n, i) => i === idx ? { ...n, ...patch } : n));

  // ── salva ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = await NotificationService.getSettings();
      const merged = {
        ...(existing || {}),
        enabled,
        timeEntryReminder: { enabled: terEnabled, time: terTime, weekendsEnabled: terWeekend },
        standbyReminder:   { enabled: sbrEnabled, notifications: sbrNotifs },
      };
      await NotificationService.saveSettings(merged);
      await NotificationService.scheduleNotifications(merged, true);
      Alert.alert('✅ Salvato', 'Impostazioni salvate e notifiche riprogrammate.');
    } catch (e) {
      Alert.alert('Errore', 'Impossibile salvare.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ── Android fix helpers ───────────────────────────────────────────
  const openExactAlarmSettings = async () => {
    try {
      if (Platform.Version >= 31)
        await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
      else
        await Linking.openSettings();
    } catch { await Linking.openSettings(); }
  };

  const openBatterySettings = async () => {
    try {
      await Linking.sendIntent('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        [{ key: 'android.provider.extra.APP_PACKAGE', value: 'com.workt.production' }]);
    } catch {
      try { await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'); }
      catch { await Linking.openSettings(); }
    }
  };

  // ── render ─────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={s.container}>
      <View style={s.loadingBox}>
        <MaterialCommunityIcons name="bell-outline" size={48} color="#ccc" />
        <Text style={s.loadingText}>Caricamento…</Text>
      </View>
    </SafeAreaView>
  );

  const dark = theme.dark;

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>

        {/* Header card */}
        <View style={s.headerCard}>
          <MaterialCommunityIcons name="bell-ring-outline" size={32} color={theme.colors.primary} />
          <Text style={[s.headerCardTitle, { color: theme.colors.text }]}>Notifiche Lavoro</Text>
          <Text style={[s.headerCardSubtitle, { color: theme.colors.textSecondary }]}>
            Configura i promemoria automatici per orari e reperibilità
          </Text>
        </View>

        {/* ── Abilita notifiche ─────────────────────── */}
        <View style={s.card}>
          <View style={s.row}>
            <MaterialCommunityIcons name="bell-ring" size={22} color="#2196F3" />
            <Text style={[s.cardTitle, { flex: 1, marginLeft: 10 }]}>Abilita notifiche</Text>
            <Switch
              value={enabled}
              onValueChange={handleMainToggle}
              trackColor={{ false: s.$trackOff, true: s.$trackOn }}
              thumbColor={enabled ? '#4CAF50' : s.$thumbOff}
            />
          </View>

          {!hasPermission && (
            <TouchableOpacity style={s.permBtn} onPress={requestPerm}>
              <MaterialCommunityIcons name="shield-check" size={18} color="#2196F3" />
              <Text style={s.permBtnText}>Richiedi permessi notifiche</Text>
            </TouchableOpacity>
          )}
        </View>

        {enabled && (
          <>
            {/* ── Promemoria Inserimento Orari ──────── */}
            <View style={s.card}>
              <View style={s.row}>
                <MaterialCommunityIcons name="clock-edit" size={22} color="#4CAF50" />
                <Text style={[s.cardTitle, { flex: 1, marginLeft: 10 }]}>Promemoria Inserimento Orari</Text>
                <Switch
                  value={terEnabled}
                  onValueChange={setTerEnabled}
                  trackColor={{ false: s.$trackOff, true: s.$trackOn }}
                  thumbColor={terEnabled ? '#4CAF50' : s.$thumbOff}
                />
              </View>

              {terEnabled && (
                <View style={s.section}>
                  <Text style={s.hint}>Ti ricorda ogni giorno di inserire le ore di lavoro.</Text>

                  <TouchableOpacity style={s.timeRow} onPress={() => openPicker(terTime, setTerTime)}>
                    <Text style={s.timeLabel}>Orario promemoria</Text>
                    <Text style={s.timeVal}>{terTime}</Text>
                  </TouchableOpacity>

                  <View style={s.row}>
                    <Text style={[s.optLabel, { flex: 1 }]}>Includi weekend</Text>
                    <Switch
                      value={terWeekend}
                      onValueChange={setTerWeekend}
                      trackColor={{ false: s.$trackOff, true: s.$trackOn }}
                      thumbColor={terWeekend ? '#4CAF50' : s.$thumbOff}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* ── Promemoria Reperibilità ───────────── */}
            <View style={s.card}>
              <View style={s.row}>
                <MaterialCommunityIcons name="phone-alert" size={22} color="#9C27B0" />
                <Text style={[s.cardTitle, { flex: 1, marginLeft: 10 }]}>Promemoria Reperibilità</Text>
                <Switch
                  value={sbrEnabled}
                  onValueChange={setSbrEnabled}
                  trackColor={{ false: s.$trackOff, true: 'rgba(156,39,176,0.4)' }}
                  thumbColor={sbrEnabled ? '#9C27B0' : s.$thumbOff}
                />
              </View>

              {sbrEnabled && (
                <View style={s.section}>
                  <Text style={s.hint}>
                    Ti avvisa prima dei turni di reperibilità registrati nel calendario dell'app.
                  </Text>

                  {sbrNotifs.map((notif, idx) => (
                    <View key={idx} style={s.notifItem}>
                      <View style={s.row}>
                        <Text style={[s.notifTitle, { flex: 1 }]}>
                          {notif.daysInAdvance === 0 ? 'Stesso giorno'
                            : notif.daysInAdvance === 1 ? 'Il giorno prima'
                            : `${notif.daysInAdvance} giorni prima`}
                        </Text>
                        <Switch
                          value={notif.enabled}
                          onValueChange={(v) => patchSbrNotif(idx, { enabled: v })}
                          trackColor={{ false: s.$trackOff, true: 'rgba(156,39,176,0.35)' }}
                          thumbColor={notif.enabled ? '#9C27B0' : s.$thumbOff}
                        />
                      </View>
                      {notif.enabled && (
                        <TouchableOpacity
                          style={[s.timeRow, { marginTop: 8 }]}
                          onPress={() => openPicker(notif.time, (t) => patchSbrNotif(idx, { time: t }))}
                        >
                          <Text style={s.timeLabel}>Orario avviso</Text>
                          <Text style={s.timeVal}>{notif.time}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ── Fix Android ──────────────────────── */}
            {Platform.OS === 'android' && (
              <View style={[s.card, { borderColor: '#FF9800', borderWidth: 1.5 }]}>
                <View style={s.row}>
                  <MaterialCommunityIcons name="android" size={22} color="#FF9800" />
                  <Text style={[s.cardTitle, { flex: 1, marginLeft: 10, color: '#FF9800' }]}>Fix Android — notifiche puntuali</Text>
                </View>
                <Text style={[s.hint, { marginTop: 8 }]}>
                  Se le notifiche arrivano solo aprendo l'app, attiva queste due impostazioni:
                </Text>

                <TouchableOpacity style={s.fixBtn} onPress={openExactAlarmSettings}>
                  <MaterialCommunityIcons name="alarm-check" size={18} color="#fff" />
                  <Text style={s.fixBtnText}>Allarmi esatti (Android 12+)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.fixBtn, { backgroundColor: '#F57C00', marginTop: 8 }]} onPress={openBatterySettings}>
                  <MaterialCommunityIcons name="battery-off" size={18} color="#fff" />
                  <Text style={s.fixBtnText}>Disabilita ottimizzazione batteria</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Pulsante salva */}
      <View style={s.saveBar}>
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
          <Text style={s.saveBtnText}>{saving ? 'Salvataggio…' : 'Salva e Riprogramma'}</Text>
        </TouchableOpacity>
      </View>

      {/* Time picker */}
      <TimePicker
        visible={picker.visible}
        value={picker.value}
        theme={theme}
        onConfirm={(t) => { picker.onConfirm(t); setPicker(p => ({ ...p, visible: false })); }}
        onCancel={() => setPicker(p => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Stili
// ─────────────────────────────────────────────────────────────────────
const createStyles = (theme) => {
  const dark = theme.dark;
  const st = StyleSheet.create({
    container:   { flex: 1, backgroundColor: theme.colors.background },
    loadingBox:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, color: theme.colors.textSecondary },

    scroll: { flex: 1 },

    headerCard: {
      margin: 16,
      marginTop: 8,
      marginBottom: 8,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: dark ? 0.3 : 0.08, shadowRadius: 4,
    },
    headerCardTitle: {
      fontSize: 22, fontWeight: 'bold', marginTop: 12, marginBottom: 6,
    },
    headerCardSubtitle: {
      fontSize: 13, textAlign: 'center', lineHeight: 19,
    },

    card: {
      backgroundColor: dark ? '#1C1C1E' : theme.colors.surface,
      borderRadius: 14, padding: 16, marginBottom: 12,
      marginHorizontal: 16,
      elevation: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: dark ? 0.3 : 0.08, shadowRadius: 4,
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
    row:       { flexDirection: 'row', alignItems: 'center' },
    section:   { marginTop: 12, paddingLeft: 32 },
    hint:      { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 10 },
    optLabel:  { fontSize: 14, color: theme.colors.text },

    timeRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderRadius: 8, padding: 12, marginBottom: 10,
      borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.15)' : '#E0E0E0',
    },
    timeLabel: { fontSize: 14, color: theme.colors.textSecondary },
    timeVal:   { fontSize: 16, fontWeight: '700', color: dark ? '#0A84FF' : '#1565C0' },

    notifItem: {
      backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(156,39,176,0.05)',
      borderRadius: 10, padding: 12, marginBottom: 8,
      borderWidth: 1, borderColor: dark ? 'rgba(156,39,176,0.2)' : 'rgba(156,39,176,0.12)',
    },
    notifTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },

    permBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: dark ? 'rgba(33,150,243,0.15)' : '#E3F2FD',
      borderRadius: 8, padding: 10, marginTop: 12,
      borderWidth: 1, borderColor: '#2196F3',
    },
    permBtnText: { marginLeft: 8, fontSize: 14, color: dark ? '#0A84FF' : '#1565C0', fontWeight: '600' },

    fixBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FF9800', borderRadius: 8, padding: 10, marginTop: 10,
    },
    fixBtnText: { color: '#fff', fontWeight: '600', fontSize: 13, marginLeft: 8 },

    saveBar: { paddingHorizontal: 16, paddingVertical: 4 },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 14,
      elevation: 2,
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 },
  });

  // Valori inline non-style (non StyleSheet)
  st.$trackOff = dark ? '#3A3A3C' : '#E0E0E0';
  st.$trackOn  = dark ? 'rgba(76,175,80,0.4)' : '#C8E6C9';
  st.$thumbOff = dark ? '#E5E5EA' : '#f4f3f4';
  return st;
};

const NotificationSettingsScreen_DUMMY_REF = 0; // lint suppressor

export default NotificationSettingsScreen;

