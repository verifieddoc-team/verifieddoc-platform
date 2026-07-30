import React, { useState, useEffect, useRef } from "react";
import { Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants/theme";

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function CountdownTimer({ durationSeconds = 205, resetKey, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const intervalRef = useRef(null);

  // Restart the countdown whenever resetKey changes (e.g. after "Resend code")
  useEffect(() => {
    setSecondsLeft(durationSeconds);
  }, [resetKey, durationSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire?.();
      return;
    }

    intervalRef.current = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(intervalRef.current);
  }, [secondsLeft, onExpire]);

  return (
    <Text style={styles.text}>
      Code expires in <Text style={styles.time}>{formatTime(secondsLeft)}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  time: {
    fontFamily: "Inter_500Medium",
    color: COLORS.text,
  },
});