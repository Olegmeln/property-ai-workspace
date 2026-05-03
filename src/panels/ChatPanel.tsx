import { FormEvent, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { useWorkspaceStore } from "../store/workspace";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

export function ChatPanel() {
  const [message, setMessage] = useState("");
  const messages = useWorkspaceStore((state) => state.chatMessages);
  const sendChatMessage = useWorkspaceStore((state) => state.sendChatMessage);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage("");
    void sendChatMessage(trimmed);
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-workspace-border bg-[#0B0E14]">
      <div className="border-b border-workspace-border px-4 py-3">
        <h2 className="text-sm font-semibold text-white">AI Chat</h2>
        <p className="text-xs text-slate-500">Messages apply to the selected agent</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border px-3 py-2 text-sm leading-6 ${
              item.role === "user"
                ? "ml-8 border-workspace-accent/40 bg-workspace-accent/10 text-slate-100"
                : "mr-8 border-workspace-border bg-workspace-card text-slate-300"
            }`}
          >
            {item.content}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="border-t border-workspace-border p-3">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Example: set budget under 700k and districts: SoCo, Mueller"
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" size="sm">
            <SendHorizonal className="h-4 w-4" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
