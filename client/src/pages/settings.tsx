import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, TextInput, Alert, Share, Platform, KeyboardAvoidingView, Linking } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from "@/hooks/use-storage";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsPage({ navigation }: Props) {
  const { data, updateSettings, resetDonationCounter, clearAllData } = useAppData();
  const { toast } = useToast();
  
  const [pinChangeOpen, setPinChangeOpen] = useState(false);
  const [resetPinOpen, setResetPinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);

  // PIN and password modal state
  const [pinModalVisible, setPinModalVisible] = useState<false | 'export' | 'import'>(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [passwordModalVisible, setPasswordModalVisible] = useState<false | 'export' | 'import'>(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pendingFileContent, setPendingFileContent] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBack = () => {
    navigation.navigate('Home');
  };

  const handleBiometricToggle = (enabled: boolean) => {
    updateSettings({ biometricEnabled: enabled });
    toast({
      title: "Settings Updated",
      description: `Biometric authentication ${enabled ? "enabled" : "disabled"}.`,
    });
  };

  const handleAutoDeleteToggle = (enabled: boolean) => {
    updateSettings({ autoDeleteEnabled: enabled });
    toast({
      title: "Settings Updated",
      description: `Auto-delete messages ${enabled ? "enabled" : "disabled"}.`,
    });
  };

  const openPinChangeModal = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setIsChangingPin(false);
    setPinChangeOpen(true);
  };

  const closePinChangeModal = () => {
    setPinChangeOpen(false);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setIsChangingPin(false);
  };

  const handlePinChange = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: "PIN Mismatch",
        description: "New PIN and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPin(true);
    try {
      const success = await auth.changePin(currentPin, newPin);
      if (success) {
        closePinChangeModal();
        toast({
          title: "PIN Changed",
          description: "Your PIN has been updated successfully.",
        });
        setTimeout(() => {
          setIsChangingPin(false);
          navigation.replace('PinAuth');
        }, 300);
      } else {
        toast({
          title: "Incorrect PIN",
          description: "Current PIN is incorrect.",
          variant: "destructive",
        });
        setIsChangingPin(false);
      }
    } catch (error) {
      setIsChangingPin(false);
      toast({
        title: "Error",
        description: "Failed to change PIN. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show PIN modal before export/import
  const startExportWithPin = () => {
    setPinInput("");
    setPinError("");
    setPinModalVisible('export');
  };
  const startImportWithPin = async () => {
    // Pick file first, then ask for PIN
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });
      let uri: string | undefined;
      if ('assets' in result && result.assets && result.assets.length > 0) {
        uri = result.assets[0].uri;
      } else if ('uri' in result) {
        uri = (result as any).uri;
      }
      if (uri) {
        const fileContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
        setPendingFileContent(fileContent);
        setPinInput("");
        setPinError("");
        setPinModalVisible('import');
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Failed to import data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle PIN submit
  const handlePinSubmit = async () => {
    setIsProcessing(true);
    setPinError("");
    const isValid = await auth.authenticate(pinInput);
    if (isValid) {
      setPinModalVisible(false);
      setPasswordInput("");
      setPasswordError("");
      setTimeout(() => setPasswordModalVisible(pinModalVisible), 200); // show password modal for same op
    } else {
      setPinError("Incorrect PIN. Please try again.");
    }
    setIsProcessing(false);
  };

  // Handle password submit for export/import
  const handlePasswordSubmit = async () => {
    setIsProcessing(true);
    setPasswordError("");
    if (!passwordInput) {
      setPasswordError("Password required");
      setIsProcessing(false);
      return;
    }
    if (passwordModalVisible === 'export') {
      try {
        const exportedData = await storage.exportDataWithPassword(passwordInput);
        const fileUri = FileSystem.cacheDirectory + 'unspoken-backup.txt';
        await FileSystem.writeAsStringAsync(fileUri, exportedData, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Export Unspoken Backup',
          UTI: 'public.text',
        });
        setPasswordModalVisible(false);
        toast({ title: 'Export Successful', description: 'Backup exported.' });
      } catch (error) {
        setPasswordError("Export failed. Try again.");
      }
    } else if (passwordModalVisible === 'import') {
      try {
        if (!pendingFileContent) throw new Error('No file selected');
        await storage.importDataWithPassword(pendingFileContent, passwordInput);
        setPasswordModalVisible(false);
        setPendingFileContent(null);
        toast({ title: 'Import Successful', description: 'Your backup has been imported and your data is now available in the app.' });
      } catch (err) {
        setPasswordError('Could not decrypt or import the backup. Wrong password?');
      }
    }
    setIsProcessing(false);
  };

  const handleExportData = async () => {
    try {
      const exportedData = await storage.exportData();
      const fileUri = FileSystem.cacheDirectory + 'unspoken-backup.txt';
      await FileSystem.writeAsStringAsync(fileUri, exportedData, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Export Unspoken Backup',
        UTI: 'public.text',
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });
      // For compatibility with different expo-document-picker versions
      let uri: string | undefined;
      if ('assets' in result && result.assets && result.assets.length > 0) {
        uri = result.assets[0].uri;
      } else if ('uri' in result) {
        uri = (result as any).uri;
      }
      if (uri) {
        const fileContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
        try {
          await storage.importData(fileContent);
          toast({
            title: 'Import Successful',
            description: 'Your backup has been imported.',
          });
        } catch (err) {
          toast({
            title: 'Import Failed',
            description: 'Could not decrypt or import the backup. This may happen if the backup was created on a different device or after reinstalling the app.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Failed to import data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTerms = () => {
    navigation.navigate('Terms');
  };

  const handleResetPin = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    if (newPin !== confirmPin) {
      toast({
        title: "PIN Mismatch",
        description: "New PIN and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits.",
        variant: "destructive",
      });
      return;
    }
    const isValid = await auth.authenticate(currentPin);
    if (!isValid) {
      toast({
        title: "Incorrect PIN",
        description: "Current PIN is incorrect.",
        variant: "destructive",
      });
      return;
    }
    await auth.setPin(newPin);
    toast({
      title: "PIN Reset",
      description: "Your PIN has been reset successfully.",
    });
    setResetPinOpen(false);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  };

  const handleSupport = () => {
    const url = 'https://buymeacoffee.com/unspokendonations';
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerChatLike}>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonChatLike}>
          <Ionicons name="arrow-back" size={24} color="#F5F5F5" />
        </TouchableOpacity>
        <View style={styles.headerTextContainerChatLike}>
          <Text style={styles.titleChatLike}>Settings</Text>
        </View>
      </View>

      {/* Settings Content */}
      <ScrollView style={styles.content}>
        {/* Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-outline" size={20} color="#D49A6A" />
            <Text style={styles.sectionTitle}>Security</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Biometric Authentication</Text>
              <Text style={styles.settingDescription}>Use fingerprint or Face ID</Text>
            </View>
            <Switch
              value={data?.settings.biometricEnabled || false}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: '#767577', true: '#D49A6A' }}
              thumbColor={data?.settings.biometricEnabled ? '#f4f3f4' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={openPinChangeModal}
          >
            <Text style={styles.settingButtonText}>Change PIN</Text>
            <Ionicons name="chevron-forward" size={16} color="#A0A0A0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={startExportWithPin}
          >
            <Text style={styles.settingButtonText}>Export Data</Text>
            <Ionicons name="download-outline" size={16} color="#A0A0A0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={startImportWithPin}
          >
            <Text style={styles.settingButtonText}>Import Data</Text>
            <Ionicons name="cloud-upload-outline" size={16} color="#A0A0A0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={handleTerms}
          >
            <Text style={styles.settingButtonText}>Terms & Privacy</Text>
            <Ionicons name="document-text-outline" size={16} color="#A0A0A0" />
          </TouchableOpacity>
        </View>

        {/* Wellness/Benefits Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart-outline" size={20} color="#D49A6A" />
            <Text style={styles.sectionTitle}>Therapeutic Benefits</Text>
          </View>
          <Text style={styles.settingDescription}>
            UNSPOKEN offers a safe space for emotional expression, helping you process thoughts and feelings through therapeutic writing. Messages remain private, supporting your mental wellness journey without pressure or judgment.
          </Text>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={20} color="#D49A6A" />
            <Text style={styles.sectionTitle}>Support & Development</Text>
          </View>
          <Text style={styles.settingDescription}>
            If you find UNSPOKEN helpful, consider supporting its development. Your feedback and support help us grow!
          </Text>
          <TouchableOpacity style={styles.supportButton} onPress={handleSupport}>
            <Ionicons name="cafe-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.supportButtonText}>Support Unspoken</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PIN Modal */}
      {pinModalVisible && (
        <View style={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 400 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter PIN</Text>
              <TextInput
                style={styles.input}
                value={pinInput}
                onChangeText={setPinInput}
                maxLength={4}
                keyboardType="numeric"
                secureTextEntry
                placeholder="Enter your 4-digit PIN"
                placeholderTextColor="#A0A0A0"
                editable={!isProcessing}
              />
              {pinError ? <Text style={{ color: '#D49A6A', marginTop: 8 }}>{pinError}</Text> : null}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setPinModalVisible(false)} disabled={isProcessing}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, (!pinInput || isProcessing) && styles.saveButtonDisabled]} onPress={handlePinSubmit} disabled={!pinInput || isProcessing}>
                  <Text style={styles.saveButtonText}>{isProcessing ? 'Verifying...' : 'Continue'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Password Modal */}
      {passwordModalVisible && (
        <View style={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 400 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{passwordModalVisible === 'export' ? 'Set Export Password' : 'Enter Import Password'}</Text>
              <TextInput
                style={styles.input}
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry
                placeholder={passwordModalVisible === 'export' ? 'Choose a password for your backup' : 'Enter password for backup'}
                placeholderTextColor="#A0A0A0"
                editable={!isProcessing}
              />
              {passwordError ? <Text style={{ color: '#D49A6A', marginTop: 8 }}>{passwordError}</Text> : null}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setPasswordModalVisible(false); setPendingFileContent(null); }} disabled={isProcessing}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, (!passwordInput || isProcessing) && styles.saveButtonDisabled]} onPress={handlePasswordSubmit} disabled={!passwordInput || isProcessing}>
                  <Text style={styles.saveButtonText}>{isProcessing ? (passwordModalVisible === 'export' ? 'Exporting...' : 'Importing...') : (passwordModalVisible === 'export' ? 'Export' : 'Import')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Change PIN Modal */}
      {pinChangeOpen && (
        <View style={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 400 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change PIN</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current PIN</Text>
                <TextInput
                  style={styles.input}
                  value={currentPin}
                  onChangeText={setCurrentPin}
                  maxLength={4}
                  keyboardType="numeric"
                  secureTextEntry
                  placeholder="Enter current PIN"
                  placeholderTextColor="#A0A0A0"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New PIN</Text>
                <TextInput
                  style={styles.input}
                  value={newPin}
                  onChangeText={setNewPin}
                  maxLength={4}
                  keyboardType="numeric"
                  secureTextEntry
                  placeholder="Enter new PIN"
                  placeholderTextColor="#A0A0A0"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm New PIN</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  maxLength={4}
                  keyboardType="numeric"
                  secureTextEntry
                  placeholder="Confirm new PIN"
                  placeholderTextColor="#A0A0A0"
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={closePinChangeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, ((!currentPin || !newPin || !confirmPin) || isChangingPin) && styles.saveButtonDisabled]}
                  onPress={handlePinChange}
                  disabled={!currentPin || !newPin || !confirmPin || isChangingPin}
                >
                  <Text style={styles.saveButtonText}>{isChangingPin ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  headerChatLike: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 12,
    minHeight: 85,
    backgroundColor: '#232323',
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  backButtonChatLike: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainerChatLike: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  titleChatLike: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F5',
    textAlign: 'left',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    backgroundColor: '#2D2D2D',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F5F5',
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingButtonText: {
    fontSize: 16,
    color: '#F5F5F5',
  },
  modal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#2D2D2D',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 8,
    padding: 12,
    color: '#F5F5F5',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#A0A0A0',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#D49A6A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '500',
  },
  modalButton: {
    backgroundColor: '#D49A6A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '500',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D49A6A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginTop: 12,
  },
  supportButtonText: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '600',
  },
});
