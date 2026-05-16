import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getAnalysis, getImageUri, setSelected } from "../services/store";
import { Candidate } from "../services/api";

export default function PreviewScreen() {
  const router = useRouter();
  const analysis = getAnalysis();
  const imageUri = getImageUri();
  const [localSelected, setLocalSelected] = useState<Candidate | null>(null);

  const candidates = analysis?.candidates || [];

  // 데이터가 없으면 메인으로 리다이렉트 (보안 및 에러 방지)
  if (!imageUri || candidates.length === 0) {
    useEffect(() => {
      router.replace("/");
    }, []);
    return null;
  }

  // 초기 로드 시 첫 번째 구도를 기본 선택
  useEffect(() => {
    setLocalSelected(candidates[0]);
  }, [candidates]);

  const handleComplete = () => {
    if (localSelected) {
      setSelected(localSelected);
    }
    router.push("/guide");
  };

  return (
    <View style={s.container}>
      {/* 메인 이미지: 선택된 구도의 합성 미리보기 */}
      <Image
        source={{ uri: localSelected?.preview_base64 ?? imageUri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* 상단 바 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Image source={require("../assets/Frame3.png")} style={s.backIcon} />
        </TouchableOpacity>
        <Text style={s.title}>구도 선택</Text>
      </View>

      {/* 하단 바 */}
      <View style={s.bottomSection}>
        {/* 구도 선택 리스트 */}
        <View style={s.candidateRow}>
          {candidates.slice(0, 3).map((item, idx) => {
            const isSelected = localSelected?.rank === item.rank;
            return (
              <TouchableOpacity
                key={item.rank}
                style={s.candidateItem}
                onPress={() => setLocalSelected(item)}
                activeOpacity={0.8}
              >
                <View style={[s.thumbnailWrapper, isSelected && s.selectedThumbnail]}>
                  <Image source={{ uri: item.preview_base64 }} style={s.thumbnail} />
                </View>
                <Text style={[s.candidateLabel, isSelected && s.selectedLabel]}>
                  구도 {idx + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 버튼 영역 */}
        <View style={s.buttonRow}>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => router.back()}
          >
            <Text style={s.btnText}>다시 생성</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.completeBtn}
            onPress={handleComplete}
          >
            <Text style={s.btnText}>선택 완료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const MINT = "#3ADFCC";
const GRAY = "#D1D1D1";

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    height: 125,
    backgroundColor: "#fff",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20
  },
  backBtn: {
    position: "absolute",
    top: 64,
    left: 24,
    width: 36,
    height: 36,
    padding: 6,
    flexDirection: "row",
    gap: 10,
  },
  backIcon: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  title: { color: "#000", fontSize: 18, fontWeight: "700" },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    height: 230,
    paddingTop: 15,
    paddingBottom: 75,
    justifyContent: "flex-start",
  },
  candidateRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 36,
    marginBottom: 20,
  },
  candidateItem: { alignItems: "center", gap: 8 },
  thumbnailWrapper: {
    width: 85,
    height: 85,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedThumbnail: { borderColor: MINT },
  thumbnail: { width: "100%", height: "100%", resizeMode: "cover" },
  candidateLabel: { fontSize: 13, color: "#B0B0B0", fontWeight: "600" },
  selectedLabel: { color: MINT },
  buttonRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  retryBtn: {
    width: 125,
    height: 44,
    backgroundColor: GRAY,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  completeBtn: {
    width: 200,
    height: 44,
    backgroundColor: MINT,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "500" },
});
