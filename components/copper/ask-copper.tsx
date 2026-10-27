"use client";

// Ask Copper: a floating button that opens a chat panel (spec.md, section 4).
// Tools on and tools off are two separate conversations, each sent with only
// its own history, so the tools-off model can't copy an answer the tools
// worked out.
import { ArrowUpIcon, MessageCircleIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SetupRequired } from "@/components/setup-required";
import { CopperAnswer } from "@/components/copper/ask-copper-answer";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { readLive } from "@/lib/ai/live";
import { askCopper, type ChatMessage } from "@/lib/copper/assistant/ask";
import type { Progress } from "@/lib/copper/assistant/progress";

const STARTERS = [
  "How much is Copper Home with Copper Plus, paid yearly, for 2 years?",
  "Is Copper Notes in Night Sky in stock?",
  "Is Copper Plus cheaper monthly or yearly?",
];

const APOLOGY = "Sorry, I couldn't answer that. Please try again.";

type Turn = { id: number; question: string; progress: Progress | null };
type Mode = "on" | "off";

const WAITING: Progress = { steps: [], reply: "", status: "working" };

/** The conversation as the model should see it: questions and finished replies. */
function messagesOf(turns: Turn[]): ChatMessage[] {
  return turns.flatMap((turn) => [
    { role: "user" as const, content: turn.question },
    ...(turn.progress && turn.progress.status === "done" && turn.progress.reply
      ? [{ role: "assistant" as const, content: turn.progress.reply }]
      : []),
  ]);
}

export function AskCopper({ aiConfigured }: { aiConfigured: boolean }) {
  const [open, setOpen] = useState(false);
  const [useTools, setUseTools] = useState(true);
  const [chats, setChats] = useState<Record<Mode, Turn[]>>({ on: [], off: [] });
  const [draft, setDraft] = useState("");
  const chatsRef = useRef(chats);
  const nextId = useRef(1);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatsRef.current = chats;
    body.current?.scrollTo?.({ top: body.current.scrollHeight });
  }, [chats]);

  // The panel opens from the launcher, from any link to #ask (clicking one
  // again fires no hashchange, so listen for the click too), and when the site
  // loads at /#ask.
  useEffect(() => {
    const fromHash = () => {
      if (window.location.hash === "#ask") setOpen(true);
    };
    const fromClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.(
        'a[href="#ask"]',
      );
      if (link) setOpen(true);
    };
    const first = setTimeout(fromHash, 0);
    window.addEventListener("hashchange", fromHash);
    document.addEventListener("click", fromClick);
    return () => {
      clearTimeout(first);
      window.removeEventListener("hashchange", fromHash);
      document.removeEventListener("click", fromClick);
    };
  }, []);

  const mode: Mode = useTools ? "on" : "off";
  const turns = chats[mode];
  const last = turns.at(-1);
  const busy =
    last !== undefined &&
    (last.progress === null || last.progress.status === "working");

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next && window.location.hash === "#ask") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }

  function patch(chat: Mode, id: number, progress: Progress) {
    setChats((c) => ({
      ...c,
      [chat]: c[chat].map((t) => (t.id === id ? { ...t, progress } : t)),
    }));
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const chat = mode;
    const id = nextId.current++;
    const history = messagesOf(chatsRef.current[chat]);
    setDraft("");
    setChats((c) => ({
      ...c,
      [chat]: [...c[chat], { id, question, progress: null }],
    }));
    try {
      const { progress } = await askCopper({
        messages: [...history, { role: "user", content: question }],
        useTools: chat === "on",
      });
      for await (const update of readLive(progress)) patch(chat, id, update);
    } catch {
      patch(chat, id, { steps: [], reply: APOLOGY, status: "error" });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  return (
    <>
      <Button
        data-testid="ask-copper-launcher"
        onClick={() => changeOpen(true)}
        className="fixed right-4 bottom-4 z-40 h-12 gap-2 rounded-full px-5 text-base shadow-lg"
      >
        <MessageCircleIcon className="size-5" />
        Ask Copper
      </Button>

      <Sheet open={open} onOpenChange={changeOpen}>
        <SheetContent
          data-testid="ask-copper"
          showCloseButton={false}
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        >
          <div className="bg-chart-5 text-white">
            <div className="flex items-center gap-3 p-4">
              <span className="bg-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                <Image
                  src="/assets/brand/copper-mascot.png"
                  alt="Copper the robot"
                  width={32}
                  height={32}
                  className="size-8 rounded-full object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-white">Ask Copper</SheetTitle>
                <SheetDescription className="text-white/70">
                  Prices, totals and stock, checked with tools.
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close"
                  className="text-white hover:text-white"
                >
                  <XIcon />
                </Button>
              </SheetClose>
            </div>
            {aiConfigured && (
              <div className="flex items-center justify-between bg-white/10 px-4 py-2">
                <div>
                  <p className="text-sm font-medium">Use tools</p>
                  <p className="text-xs text-white/70">
                    {useTools ? "Checks every answer" : "Model guesses alone"}
                  </p>
                </div>
                <Switch
                  aria-label="Use tools"
                  checked={useTools}
                  onCheckedChange={setUseTools}
                />
              </div>
            )}
          </div>

          {aiConfigured ? (
            <>
              <div
                ref={body}
                className="bg-secondary flex-1 space-y-4 overflow-y-auto p-4"
              >
                {turns.map((turn) => (
                  <div key={turn.id} className="space-y-3">
                    <p className="bg-primary text-primary-foreground ml-auto w-fit max-w-[85%] rounded-xl rounded-tr-none px-3 py-2 text-sm">
                      {turn.question}
                    </p>
                    <CopperAnswer
                      progress={turn.progress ?? WAITING}
                      useTools={useTools}
                    />
                  </div>
                ))}
                {!busy && (
                  <div className="flex flex-col items-start gap-2">
                    {turns.length === 0 && (
                      <p className="text-muted-foreground text-sm">
                        Hi, I&apos;m Copper. Try one of these:
                      </p>
                    )}
                    {STARTERS.map((starter) => (
                      <Button
                        key={starter}
                        variant="outline"
                        className="h-auto max-w-full justify-start rounded-xl px-3 py-2 text-left whitespace-normal"
                        onClick={() => void send(starter)}
                      >
                        {starter}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <form
                onSubmit={submit}
                className="bg-background flex items-center gap-2 border-t p-3"
              >
                <input
                  aria-label="Your question"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask about prices, totals or stock"
                  className="border-input focus-visible:ring-ring/50 h-10 min-w-0 flex-1 rounded-full border px-4 text-sm outline-none focus-visible:ring-3"
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send"
                  disabled={busy}
                  className="size-10 rounded-full"
                >
                  <ArrowUpIcon />
                </Button>
              </form>
            </>
          ) : (
            <div className="bg-secondary flex-1 overflow-y-auto p-4">
              <SetupRequired service="ai" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
