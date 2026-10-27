import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { auth } from "@/lib/auth";
import { useAppData } from "@/hooks/use-storage";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import logoPath from "@assets/logo_portocaliu.png";
import * as ImagePicker from 'expo-image-picker';
import type { AvatarColor } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface Conversation {
  contact: {
    id: string;
    name: string;
    avatar: string;
    imageUrl?: string;
    color?: AvatarColor;
  };
  lastMessage?: {
    text: string;
    timestamp: string;
  };
  isClosed: boolean;
}

export default function HomePage({ navigation }: Props) {
  const { data, isLoading, getConversationsWithContacts, deleteContact, updateData, reloadData } = useAppData();
  const { toast } = useToast();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [newContactName, setNewContactName] = useState("");
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [optionsContact, setOptionsContact] = useState<any>(null);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      navigation.replace('PinAuth');
      return;
    }
    
    // Extend session on page load
    auth.extendSession();
  }, [navigation]);

  // Force refresh app data when Home page is focused
  useFocusEffect(
    React.useCallback(() => {
      reloadData();
    }, [reloadData])
  );

  const conversations = getConversationsWithContacts() as Conversation[];

  // Helper to get the latest contact data by ID
  const getContactById = (id: string) => data?.contacts.find(c => c.id === id);

  const handleContactClick = (contactId: string) => {
    navigation.navigate('Chat', { contactId });
  };

  const handleSettingsClick = () => {
    navigation.navigate('Settings');
  };

  const handleNewConversation = () => {
    navigation.navigate('ContactSelection');
  };

  const handleRenameContact = (contact: any) => {
    // Always use the latest contact data
    const latestContact = getContactById(contact.id) || contact;
    setSelectedContact(latestContact);
    setNewContactName(latestContact.name);
    setRenameDialogOpen(true);
  };

  const handleSaveRename = () => {
    if (!selectedContact || !newContactName.trim()) return;
    updateData(data => ({
      ...data,
      contacts: data.contacts.map(c =>
        c.id === selectedContact.id
          ? { ...c, name: newContactName.trim(), avatar: newContactName.trim().charAt(0).toUpperCase() }
          : c
      )
    }));
    toast({
      title: "Contact Renamed",
      description: `Contact renamed to ${newContactName.trim()}`,
    });
    setRenameDialogOpen(false);
    setSelectedContact(null);
    setNewContactName("");
  };

  const handleDeleteConversation = (contactId: string, contactName: string) => {
    Alert.alert(
      "Delete Conversation",
      `Are you sure you want to delete the conversation with ${contactName}? This will remove all messages and cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteContact(contactId);
            toast({
              title: "Conversation Deleted",
              description: `Conversation with ${contactName} has been deleted.`,
            });
          }
        }
      ]
    );
  };

  const handleChangeAvatar = (contact: any) => {
    const latestContact = getContactById(contact.id) || contact;
    const colors: AvatarColor[] = [
      "from-pink-500 to-rose-600",
      "from-blue-500 to-indigo-600",
      "from-purple-500 to-violet-600",
      "from-green-500 to-emerald-600",
      "from-orange-500 to-amber-600",
      "from-red-500 to-pink-600",
      "from-cyan-500 to-blue-600",
      "from-violet-500 to-purple-600",
    ];
    const currentColorIndex = colors.indexOf(latestContact.color as AvatarColor);
    const nextColorIndex = (currentColorIndex + 1) % colors.length;
    const newColor = colors[nextColorIndex] as AvatarColor;
    updateData(data => ({
      ...data,
      contacts: data.contacts.map(c =>
        c.id === latestContact.id
          ? { ...c, color: newColor }
          : c
      )
    }));
    toast({
      title: "Avatar Updated",
      description: "Contact avatar color has been changed.",
    });
  };

  const openOptionsModal = (contact: any) => {
    setOptionsContact(contact);
    setOptionsDialogOpen(true);
  };
  const closeOptionsModal = () => {
    setOptionsDialogOpen(false);
    setOptionsContact(null);
  };

  const handleRemovePicture = (contactId: string) => {
    updateData(data => ({
      ...data,
      contacts: data.contacts.map(contact =>
        contact.id === contactId
          ? { ...contact, imageUrl: undefined }
          : contact
      )
    }));
    toast({
      title: "Picture Removed",
      description: "Avatar picture removed. Default avatar restored.",
    });
    closeOptionsModal();
  };

  const handleUploadImage = async (contactId: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0].uri) {
        updateData(data => ({
          ...data,
          contacts: data.contacts.map(contact =>
            contact.id === contactId
              ? { ...contact, imageUrl: result.assets[0].uri }
              : contact
          )
        }));
        toast({
          title: "Success",
          description: "Avatar image updated successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update avatar image.",
      });
    }
  };

  // Helper to map AvatarColor to real color value
  const getAvatarBgColor = (color: AvatarColor | undefined) => {
    switch (color) {
      case 'from-pink-500 to-rose-600': return '#EC4899';
      case 'from-blue-500 to-indigo-600': return '#3B82F6';
      case 'from-purple-500 to-violet-600': return '#8B5CF6';
      case 'from-green-500 to-emerald-600': return '#10B981';
      case 'from-orange-500 to-amber-600': return '#F59E42';
      case 'from-red-500 to-pink-600': return '#EF4444';
      case 'from-cyan-500 to-blue-600': return '#06B6D4';
      case 'from-violet-500 to-purple-600': return '#7C3AED';
      default: return '#D49A6A';
    }
  };

  // --- Modal for renaming contact ---
  const renderRenameModal = () => (
    renameDialogOpen && (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Rename Contact</Text>
          <TextInput
            style={styles.modalInput}
            value={newContactName}
            onChangeText={setNewContactName}
            maxLength={32}
            placeholder="Enter new name"
            placeholderTextColor="#A0A0A0"
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setRenameDialogOpen(false);
                setSelectedContact(null);
                setNewContactName("");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (!newContactName.trim()) && styles.saveButtonDisabled]}
              onPress={handleSaveRename}
              disabled={!newContactName.trim()}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  );

  // --- Modal for contact options ---
  const renderOptionsModal = () => (
    optionsDialogOpen && optionsContact && (
      <View style={styles.modalOverlay}>
        <View style={styles.optionsModalContent}>
          <Text style={styles.modalTitle}>Contact Options</Text>
          <TouchableOpacity style={styles.optionsButton} onPress={() => { closeOptionsModal(); handleRenameContact(optionsContact); }}>
            <Ionicons name="pencil" size={18} color="#D49A6A" style={{ marginRight: 10 }} />
            <Text style={styles.optionsButtonText}>Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionsButton} onPress={() => { closeOptionsModal(); handleUploadImage(optionsContact.id); }}>
            <Ionicons name="image" size={18} color="#D49A6A" style={{ marginRight: 10 }} />
            <Text style={styles.optionsButtonText}>Change Picture</Text>
          </TouchableOpacity>
          {optionsContact.imageUrl && (
            <TouchableOpacity style={styles.optionsButton} onPress={() => handleRemovePicture(optionsContact.id)}>
              <Ionicons name="close-circle" size={18} color="#D49A6A" style={{ marginRight: 10 }} />
              <Text style={styles.optionsButtonText}>Remove Picture</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.optionsButton, styles.optionsDeleteButton]} onPress={() => { closeOptionsModal(); handleDeleteConversation(optionsContact.id, optionsContact.name); }}>
            <Ionicons name="trash" size={18} color="#FF5A5A" style={{ marginRight: 10 }} />
            <Text style={[styles.optionsButtonText, { color: '#FF5A5A' }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionsCancelButton} onPress={closeOptionsModal}>
            <Text style={styles.optionsCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D49A6A" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={logoPath}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Conversations</Text>
        </View>
        <TouchableOpacity
          onPress={handleSettingsClick}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={24} color="#A0A0A0" />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <ScrollView style={styles.conversationsList}>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="add" size={32} color="#A0A0A0" />
            </View>
            <Text style={styles.emptyStateTitle}>
              No conversations yet
            </Text>
            <Text style={styles.emptyStateDescription}>
              Start your therapeutic journey by creating your first conversation.
            </Text>
            <TouchableOpacity
              onPress={handleNewConversation}
              style={styles.newConversationButton}
            >
              <Text style={styles.newConversationButtonText}>Start New Conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          conversations.map((conversation) => {
            // Always get the latest contact data for menu actions and avatar
            const latestContact = getContactById(conversation.contact.id) || conversation.contact;
            return (
              <TouchableOpacity
                key={latestContact.id}
                style={styles.conversationCard}
                onPress={() => handleContactClick(latestContact.id)}
              >
                <View style={styles.conversationContent}>
                  {latestContact.imageUrl ? (
                    <Image
                      source={{ uri: latestContact.imageUrl }}
                      style={styles.contactAvatar}
                    />
                  ) : (
                    <View style={[styles.contactAvatar, { backgroundColor: getAvatarBgColor(latestContact.color) }]}>
                      <Text style={styles.contactAvatarText}>
                        {latestContact.avatar}
                      </Text>
                    </View>
                  )}
                  <View style={styles.conversationInfo}>
                    <Text style={[styles.contactName, { fontSize: styles.contactName.fontSize * 1.2 }]} numberOfLines={1} ellipsizeMode="tail">
                      {latestContact.name.length > 30 ? latestContact.name.slice(0, 30) + '...' : latestContact.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                      {conversation.isClosed ? (
                        <Text style={[styles.lastMessageTime, { flex: 1, color: '#22C55E', fontWeight: 'bold' }]}>Closure</Text>
                      ) : (
                        <>
                          <Text style={[styles.lastMessageTime, { flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                            {conversation.lastMessage
                              ? (conversation.lastMessage.text.length > 25
                                  ? conversation.lastMessage.text.slice(0, 25) + '...'
                                  : conversation.lastMessage.text)
                              : "No messages"}
                          </Text>
                          {conversation.lastMessage && conversation.lastMessage.timestamp && (
                            <Text style={[styles.lastMessageTime, { fontSize: 12, color: '#7A7A7A', textAlign: 'right', minWidth: 48 }]}> {format(new Date(conversation.lastMessage.timestamp), 'HH:mm')}</Text>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => openOptionsModal(latestContact)}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#A0A0A0" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Gradient Overlay */}
      <LinearGradient
        colors={["transparent", "#1E1E1E"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Floating Action Button */}
      {conversations.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNewConversation}
        >
          <Ionicons name="add" size={24} color="#1E1E1E" />
        </TouchableOpacity>
      )}

      {/* Rename Modal */}
      {renderRenameModal()}
      {/* Contact Options Modal */}
      {renderOptionsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#A0A0A0',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 5,
    minHeight: 85,
    backgroundColor: '#232323',
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    marginRight: -2,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F5F5F5',
    
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  emptyStateDescription: {
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 24,
  },
  newConversationButton: {
    backgroundColor: '#D49A6A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  newConversationButtonText: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '500',
  },
  conversationCard: {
    backgroundColor: '#2D2D2D',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarText: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '600',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 16,
  },
  contactName: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  lastMessageTime: {
    color: '#A0A0A0',
    fontSize: 14,
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D49A6A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: '#232323',
    borderRadius: 20,
    padding: 28,
    width: '90%',
    maxWidth: 350,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 10,
    padding: 12,
    color: '#F5F5F5',
    fontSize: 16,
    width: '100%',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
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
  optionsModalContent: {
    backgroundColor: '#232323',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 350,
    alignItems: 'stretch',
  },
  optionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#2D2D2D',
  },
  optionsButtonText: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '500',
  },
  optionsDeleteButton: {
    backgroundColor: '#2D2D2D',
    borderWidth: 1,
    borderColor: '#FF5A5A',
  },
  optionsCancelButton: {
    marginTop: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  optionsCancelButtonText: {
    color: '#A0A0A0',
    fontSize: 16,
    fontWeight: '500',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
    zIndex: 10,
  },
});
