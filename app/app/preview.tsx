import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { analyzeLandscape, type Candidate } from "../services/api";
import { getImageUri, setAnalysis, setSelected } from "../services/store";

const TEAL = "#4ECDC4";

export default function PreviewScreen() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const runAnalysis = () => {
    const uri = getImageUri();
    if (!uri) { router.replace("/"); return; }
    setLoading(true);
    setError(null);
    analyzeLandscape(uri)
      .then((res) => {
        setAnalysis(res);
        setCandidates(res.candidates);
        setPicked(res.candidates[0] ?? null);
      })
      .catch((e) => setError(e?.message ?? "분석 실패"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { runAnalysis(); }, []);

  const confirm = () => {
    if (!picked) return;
    setSelected(picked);
    router.push("/guide");
  };

  if (loading) {
    return (
      <View style={s.bg}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={s.loadingText}>풍경 분석 중</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.bg}>
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.tealBtn} onPress={runAnalysis}>
            <Text style={s.tealBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.bg}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerSide} onPress={() => router.back()}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>구도 선택</Text>
        <View style={s.headerSide} />
      </View>

      {/* 메인 미리보기 */}
      <View style={s.mainArea}>
        {picked && (
          <Image
            source={{ uri: picked.preview_base64 }}
            style={s.mainImage}
            resizeMode="contain"
          />
        )}
      </View>

      {/* 하단 섹션 */}
      <View style={s.bottom}>
        {/* 썸네일 행 */}
        <View style={s.thumbRow}>
          {candidates.map((c, i) => (
            <TouchableOpacity
              key={c.rank}
              style={[s.thumbCard, picked?.rank === c.rank && s.thumbCardActive]}
              onPress={() => setPicked(c)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: c.preview_base64 }}
                style={s.thumbImage}
                resizeMode="cover"
              />
              <Text style={[s.thumbLabel, picked?.rank === c.rank && s.thumbLabelActive]}>
                구도 {i + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 버튼 행 */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.grayBtn} onPress={() => router.back()}>
            <Text style={s.grayBtnText}>다시 생성</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tealBtn, !picked && s.tealBtnDisabled]}
            onPress={confirm}
            disabled={!picked}
            activeOpacity={0.85}
          >
            <Text style={s.tealBtnText}>선택 완료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerSide: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backText: { color: "#fff", fontSize: 24 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },

  mainArea: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  mainImage: { width: "100%", height: "100%" },

  bottom: {
    backgroundColor: "rgba(0,0,0,0.88)",
    paddingTop: 14,
    paddingBottom: 40,
    gap: 14,
  },

  thumbRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
  },
  thumbCard: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbCardActive: { borderColor: TEAL },
  thumbImage: { width: "100%", aspectRatio: 0.75 },
  thumbLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  thumbLabelActive: { color: TEAL, fontWeight: "700" },

  btnRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  grayBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  grayBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tealBtn: {
    flex: 1,
    backgroundColor: TEAL,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  tealBtnDisabled: { opacity: 0.45 },
  tealBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  loadingText: { color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 8 },
  errorText: { color: "#ff6b6b", fontSize: 15, textAlign: "center", paddingHorizontal: 32 },
});
