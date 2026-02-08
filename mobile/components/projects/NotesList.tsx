import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../../lib/tokens";
import { formatRelativeTime } from "../../lib/time";
import { Button } from "../ui/Button";
import type { Note } from "../../types/api";

interface NotesListProps {
  notes: Note[];
  onAddNote: (content: string) => void;
  isAddingNote: boolean;
}

export function NotesList({ notes, onAddNote, isAddingNote }: NotesListProps) {
  const [showSheet, setShowSheet] = useState(false);
  const [noteText, setNoteText] = useState("");

  const handleAddNote = () => {
    if (noteText.trim()) {
      onAddNote(noteText.trim());
      setNoteText("");
      setShowSheet(false);
    }
  };

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>NOTES ({notes.length})</Text>
        <Pressable
          onPress={() => setShowSheet(true)}
          accessibilityLabel="Add a note"
          accessibilityHint="Opens a text input to add a note to this project"
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={tokens.accent}
          />
        </Pressable>
      </View>

      <View style={styles.divider} />

      {notes.map((note) => (
        <View key={note.id} style={styles.noteCard}>
          <Text style={styles.noteText}>{note.content}</Text>
          <Text style={styles.noteTimestamp}>
            {formatRelativeTime(note.createdAt)}
          </Text>
        </View>
      ))}

      {notes.length === 0 && (
        <Text style={styles.emptyText}>No notes yet</Text>
      )}

      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setShowSheet(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetContainer}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note..."
              placeholderTextColor={tokens.textMuted}
              multiline
              value={noteText}
              onChangeText={setNoteText}
              autoFocus
              textAlignVertical="top"
            />
            <Button
              label="Add Note"
              onPress={handleAddNote}
              loading={isAddingNote}
              disabled={!noteText.trim()}
              fullWidth
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontFamily: "Inter-SemiBold",
    fontSize: tokens.textSm,
    color: tokens.textMuted,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.border,
    marginBottom: tokens.space3,
    marginTop: tokens.space2,
  },
  noteCard: {
    backgroundColor: tokens.bgCard,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusMd,
    padding: tokens.space3,
    marginBottom: tokens.space2,
  },
  noteText: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textSecondary,
    lineHeight: tokens.textSm * 1.5,
  },
  noteTimestamp: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textXs,
    color: tokens.textMuted,
    marginTop: tokens.space2,
  },
  emptyText: {
    fontFamily: "Inter-Regular",
    fontSize: tokens.textSm,
    color: tokens.textMuted,
    fontStyle: "italic",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContainer: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: tokens.bgCard,
    borderTopLeftRadius: tokens.radiusXl,
    borderTopRightRadius: tokens.radiusXl,
    padding: tokens.space4,
    paddingBottom: tokens.space8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: tokens.bgCardHover,
    borderRadius: tokens.radiusFull,
    alignSelf: "center",
    marginBottom: tokens.space4,
  },
  noteInput: {
    backgroundColor: tokens.bgPrimary,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusMd,
    padding: tokens.space3,
    fontFamily: "Inter-Regular",
    fontSize: tokens.textBase,
    color: tokens.textPrimary,
    minHeight: 80,
    marginBottom: tokens.space3,
  },
});
