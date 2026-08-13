import { useCallback } from "react";
import { WebView } from "react-native-webview";

const FP_URL = "https://bella-plus-mulherao.web.app/fingerprint.html";

export default function DeviceFingerprint({ onReady }) {
  const onMsg = useCallback((event) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === "fp" && d.id) {
        onReady(d.id);
      }
    } catch {}
  }, [onReady]);

  return (
    <WebView
      source={{ uri: FP_URL }}
      style={{ height: 0, width: 0, opacity: 0 }}
      onMessage={onMsg}
      javaScriptEnabled
      originWhitelist={["*"]}
      mixedContentMode="always"
    />
  );
}
