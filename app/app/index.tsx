import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { setImageUri, setPhotoSize, setAnalysis } from "../services/store";
import { analyzeLandscape } from "../services/api";

type Mode = "ar" | "normal" | "silhouette";
const MODES: { key: Mode; label: string }[] = [
  { key: "ar", label: "AR 가이드" },
  { key: "normal", label: "일반" },
  { key: "silhouette", label: "실루엣 모드" },
];
const ZOOMS = [
  { label: "0.5x", expo: 0 },
  { label: "1x", expo: 0.15 },
  { label: "2x", expo: 0.45 },
];

export default function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>("silhouette");
  const [zoomIdx, setZoomIdx] = useState(1);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  // 스피너 애니메이션 설정
  useEffect(() => {
    if (analyzing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [analyzing]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useFocusEffect(
    useCallback(() => {
      setAnalyzing(false);
      setCapturing(false);
      setCapturedImage(null);
    }, [])
  );

  const capture = async () => {
    if (!cameraRef.current || capturing || analyzing) return;

    setCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 250);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        const uri = photo.uri;
        setCapturedImage(uri);
        setImageUri(uri);
        setPhotoSize({ width: photo.width || 0, height: photo.height || 0 });

        setAnalyzing(true);
        try {
          console.log("서버 분석 요청 시작...");
          const result = await analyzeLandscape(uri);
          setAnalysis(result);
          console.log("서버 분석 완료.");
          router.push("/preview");
        } catch (e) {
          console.error("분석 실패:", e);
          alert("서버 통신에 실패했습니다. 네트워크 상태나 서버 주소를 확인해주세요.");
        }
      }
    } finally {
      setCapturing(false);
    }
  };

  const pickImage = async () => {
    if (capturing || analyzing) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // 분석을 위해 원본 비율 유지
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0].uri) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setPhotoSize({ width: asset.width || 0, height: asset.height || 0 });
      setCapturedImage(asset.uri);

      setAnalyzing(true);
      try {
        console.log("갤러리 이미지 분석 시작...");
        const res = await analyzeLandscape(asset.uri);
        setAnalysis(res);
        router.push("/preview");
      } catch (e) {
        console.error("분석 실패:", e);
        alert("분석 중 오류가 발생했습니다.");
        setAnalyzing(false);
        setCapturedImage(null);
      }
    }
  };

  if (!permission) return <View style={s.bg} />;

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.text}>카메라 권한이 필요합니다</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>권한 허용</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.bg}>
      {/* 카메라 뷰 또는 캡처된 이미지 */}
      {!analyzing && (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} zoom={ZOOMS[zoomIdx].expo} />
      )}
      {analyzing && capturedImage && (
        <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      {/* 플래시 */}
      {flash && <View style={s.flash} />}

      {/* 분석 중 오버레이 */}
      {analyzing && (
        <View style={s.analyzingOverlay}>
          <View style={s.dimLayer} />
          <View style={s.spinnerContainer}>
            <Animated.View style={[s.spinner, { transform: [{ rotate: spin }] }]} />
            <Text style={s.analyzingText}>풍경 분석 중</Text>
          </View>
        </View>
      )}

      {/* 상단 바 */}
      <View style={[s.topBar, { zIndex: 20 }]}>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <Image source={require("../assets/Frame2.png")} style={s.topIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => setFlash(!flash)}>
          <Image source={require("../assets/Frame1.png")} style={s.topIcon} />
        </TouchableOpacity>
      </View>

      {/* 하단 컨트롤 */}
      <View style={[s.bottomSection, { zIndex: 20 }]}>
        {/* 줌 버튼: 하단 바 외부(카메라 위)로 플로팅 처리 */}
        <View style={s.zoomRow}>
          {ZOOMS.map(({ label }, i) => (
            <TouchableOpacity
              key={label}
              style={[s.zoomBtn, zoomIdx === i && s.zoomBtnActive]}
              onPress={() => setZoomIdx(i)}
            >
              <Text style={s.zoomLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 모드 탭 */}
        <View style={s.modeRow}>
          {MODES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={s.modeTab}
              onPress={() => setMode(key)}
            >
              <Text style={[s.modeLabel, mode === key ? s.modeLabelActive : s.modeLabelInactive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 셔터 행 */}
        <View style={s.shutterRow}>
          {/* 갤러리 버튼 */}
          <TouchableOpacity style={s.thumbBtn} onPress={pickImage} />

          {/* 셔터 */}
          <TouchableOpacity
            style={[s.shutterOuter, capturing && s.shutterPressed]}
            onPress={capture}
            activeOpacity={0.8}
          >
            <View style={s.shutterInner} />
          </TouchableOpacity>

          {/* 카메라 전환 버튼 */}
          <TouchableOpacity
            style={s.flipBtn}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <Image source={require("../assets/Frame5.png")} style={s.topIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const TEAL = "#20C5B2";

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  text: { color: "#fff", fontSize: 16, marginBottom: 16 },
  permBtn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  permBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: "#fff", opacity: 0.5 },

  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10, // 상단/하단 바 아래에 위치
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(110, 110, 110, 0.5)",
  },
  spinnerContainer: {
    position: "absolute",
    top: 303,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  spinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 7,
    borderColor: "#D1D1D1", // 기본 원 색상
    borderTopColor: "#3ADFCC", // 돌아가는 부분 색상
  },
  analyzingText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 30,
    textAlign: "center",
  },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 125, // 높이를 약간 키워 노치 대응
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 20, // 아이콘이 너무 상단에 붙지 않게 조정
  },
  iconBtn: {
    width: 46, // 아이콘 크기를 더 키움
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  iconText: { color: "#000", fontSize: 18 },
  topIcon: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    height: 230, // 하단 바 길이를 더 늘림
    paddingBottom: 80, // 내부 UI를 더 위로 밀어 올림
    paddingTop: 15,
    gap: 15,
  },

  zoomRow: {
    position: "absolute",
    top: -60, // 하단 바 위로 띄움
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
    width: "100%",
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnActive: { backgroundColor: "#7C7C7C" },
  zoomLabel: { color: "#fff", fontSize: 13, fontWeight: "600" },

  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20, // 모드 탭 사이의 간격을 더 좁게
  },
  modeTab: {
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  modeLabel: { fontSize: 17, fontWeight: "600" },
  modeLabelActive: { color: "#3ADFCC" },
  modeLabelInactive: { color: "#B0B0B0" },

  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginTop: 4,
  },
  thumbBtn: {
    width: 50,
    height: 50,
    borderRadius: 64,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  flipBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipIcon: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  shutterOuter: {
    width: 77,
    height: 77,
    borderRadius: 77 / 2,
    borderWidth: 6,
    borderColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterPressed: { opacity: 0.7 },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#fff" }, // 내부를 하얀색으로 채움
});
