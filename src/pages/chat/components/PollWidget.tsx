import React from "react";
import { Progress } from "antd";
import { BarChartOutlined, CheckCircleFilled } from "@ant-design/icons";

export interface PollData {
  id: string;
  question: string;
  options: Array<{ id?: string; text: string; voters?: string[]; votes?: string[] }>;
  allowMultiple?: boolean;
}

interface PollWidgetProps {
  poll: PollData;
  currentUserId?: string;
  onVote: (pollId: string, optionId: string) => void;
  isSentByMe?: boolean;
}

export const PollWidget: React.FC<PollWidgetProps> = ({
  poll,
  currentUserId,
  onVote,
  isSentByMe = false,
}) => {
  const getVoters = (opt: any): string[] => {
    if (Array.isArray(opt?.voters)) return opt.voters;
    if (Array.isArray(opt?.votes)) return opt.votes;
    return [];
  };

  const totalVotes = (poll.options || []).reduce((acc, opt) => acc + getVoters(opt).length, 0);

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 16,
        background: isSentByMe ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.03)",
        border: `1px solid ${isSentByMe ? "rgba(255, 255, 255, 0.2)" : "rgba(0,0,0,0.08)"}`,
        minWidth: 260,
        maxWidth: 340,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <BarChartOutlined style={{ fontSize: 18, color: isSentByMe ? "#fff" : "#1890ff" }} />
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: isSentByMe ? "#fff" : "inherit" }}>
          {poll.question}
        </h4>
      </div>

      {poll.allowMultiple && (
        <div style={{ fontSize: 11, color: isSentByMe ? "rgba(255,255,255,0.8)" : "#8c8c8c", marginBottom: 8, fontStyle: "italic" }}>
          Select one or more options
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
        {(poll.options || []).map((opt, idx) => {
          const voterList = getVoters(opt);
          const hasVoted = currentUserId ? voterList.includes(currentUserId) : false;
          const pct = totalVotes > 0 ? Math.round((voterList.length / totalVotes) * 100) : 0;
          const optKey = opt.id || `opt_${idx}`;

          return (
            <div
              key={optKey}
              onClick={(e) => {
                e.stopPropagation();
                onVote(poll.id, optKey);
              }}
              style={{
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: 10,
                background: hasVoted
                  ? (isSentByMe ? "rgba(255,255,255,0.25)" : "rgba(24, 144, 255, 0.14)")
                  : (isSentByMe ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"),
                border: `1px solid ${hasVoted ? "#1890ff" : isSentByMe ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)"}`,
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: isSentByMe ? "#fff" : "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                  {opt.text}
                  {hasVoted && <CheckCircleFilled style={{ color: "#52c41a", fontSize: 14 }} />}
                </span>
                <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
                  {voterList.length} ({pct}%)
                </span>
              </div>

              <Progress
                percent={pct}
                showInfo={false}
                strokeColor={hasVoted ? "#52c41a" : (isSentByMe ? "#fff" : "#1890ff")}
                size="small"
              />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.75, textAlign: "right", color: isSentByMe ? "#fff" : "inherit" }}>
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
      </div>
    </div>
  );
};

export default PollWidget;
