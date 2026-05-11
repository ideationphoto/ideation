import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Candidate } from "../services/api";

interface Props {
  candidate: Candidate;
  selected: boolean;
  onPress: () => void;
}

export default function CandidateCard({ candidate, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: candidate.preview_base64 }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.badge}>
        <Text style={styles.badgeRank}>#{candidate.rank}</Text>
        <Text style={styles.badgeScore}>{candidate.nima_score.toFixed(1)}점</Text>
      </View>
      {selected && <View style={styles.checkMark}><Text style={styles.checkText}>✓</Text></View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    margin: 4,
  },
  cardSelected: {
    borderColor: "#4f8ef7",
  },
  image: { width: "100%", aspectRatio: 3 / 4 },
  badge: {
    position: "absolute", bottom: 6, left: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8,
    flexDirection: "row", gap: 6,
  },
  badgeRank: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  badgeScore: { color: "#ffd700", fontSize: 12 },
  checkMark: {
    position: "absolute", top: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#4f8ef7",
    alignItems: "center", justifyContent: "center",
  },
  checkText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});
