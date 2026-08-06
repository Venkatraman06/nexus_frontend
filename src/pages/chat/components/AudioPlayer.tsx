import React, { useState, useRef, useEffect } from "react";
import { Button, Slider } from "antd";
import { PlayCircleFilled, PauseCircleFilled, AudioOutlined } from "@ant-design/icons";

interface AudioPlayerProps {
  src: string;
  durationText?: string;
  senderName?: string;
  isSentByMe?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  durationText,
  senderName,
  isSentByMe = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSliderChange = (val: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const toggleRate = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 16,
        background: isSentByMe
          ? "rgba(255, 255, 255, 0.15)"
          : "rgba(0, 0, 0, 0.04)",
        minWidth: 240,
        maxWidth: 320,
      }}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <Button
        type="text"
        shape="circle"
        icon={
          isPlaying ? (
            <PauseCircleFilled style={{ fontSize: 32, color: isSentByMe ? "#fff" : "#1890ff" }} />
          ) : (
            <PlayCircleFilled style={{ fontSize: 32, color: isSentByMe ? "#fff" : "#1890ff" }} />
          )
        }
        onClick={togglePlay}
        style={{ padding: 0, width: 36, height: 36 }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8, display: "flex", alignItems: "center", gap: 4 }}>
            <AudioOutlined /> Voice Message
          </span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>
            {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : (durationText || "0:00")}
          </span>
        </div>

        <Slider
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSliderChange}
          tooltip={{ open: false }}
          style={{ margin: "4px 0" }}
        />
      </div>

      <Button
        size="small"
        type="text"
        onClick={toggleRate}
        style={{
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 12,
          padding: "0 6px",
          height: 22,
          background: "rgba(0,0,0,0.08)",
          color: isSentByMe ? "#fff" : "inherit",
        }}
      >
        {playbackRate}x
      </Button>
    </div>
  );
};

export default AudioPlayer;
