"use client";

import { useEffect, useRef, useState } from "react";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";

type Message = {
  role: "student" | "studify";
  content: string;
};

type SubjectCategory = {
  name: string;
  subjects: string[];
};

type Chat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  subject: string;
  messages: Message[];
};

const STUDIFY_PLUS_PLAN_ID =
  "cplan_3IN6u3vzPhNK174pCAnOqxQ75Mb";

const subjectCategories: SubjectCategory[] = [
  {
    name: "Math",
    subjects: [
      "Statistics",
      "Calculus",
      "Precalculus",
      "Algebra",
      "Geometry",
      "Trigonometry",
    ],
  },
  {
    name: "Science",
    subjects: [
      "Physics",
      "Chemistry",
      "Biology",
      "Environmental Science",
    ],
  },
  {
    name: "Languages",
    subjects: [
      "English",
      "Spanish",
      "French",
      "German",
    ],
  },
  {
    name: "Business & Finance",
    subjects: [
      "Business",
      "Finance",
      "Economics",
      "Accounting",
    ],
  },
  {
    name: "Humanities & Social Science",
    subjects: [
      "Psychology",
      "History",
      "Government",
      "Sociology",
    ],
  },
  {
    name: "Other",
    subjects: [
      "Computer Science",
      "Study Skills",
      "Test Prep",
    ],
  },
];

const STORAGE_KEY = "jelvo-chats";

function createChatId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createChatTitle(question: string) {
  const cleaned = question
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .trim();

  if (!cleaned) return "New Chat";

  if (cleaned.length <= 38) {
    return cleaned;
  }

  return `${cleaned.slice(0, 38)}...`;
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("Statistics");

  const [openCategory, setOpenCategory] = useState("Math");

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(
    null
  );

  const [editingChatId, setEditingChatId] = useState<string | null>(
    null
  );
  const [editingTitle, setEditingTitle] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [toolsOpen, setToolsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedChats = localStorage.getItem(STORAGE_KEY);

      if (savedChats) {
        const parsedChats = JSON.parse(savedChats) as Chat[];
        setChats(parsedChats);
      }
    } catch (err) {
      console.error("Could not load saved Jelvo chats:", err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (err) {
      console.error("Could not save saved Jelvo chats:", err);
    }
  }, [chats]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== "studify") {
      return;
    }

    setDisplayedText("");
    setIsTyping(true);

    let index = 0;

    const interval = setInterval(() => {
      index++;

      setDisplayedText(
        lastMessage.content.slice(0, index)
      );

      if (index >= lastMessage.content.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [messages]);

  function updateChat(updatedChat: Chat) {
    setChats((previousChats) =>
      previousChats.map((chat) =>
        chat.id === updatedChat.id ? updatedChat : chat
      )
    );
  }

  async function askStudify() {
    if (!question.trim() || loading) return;

    const studentQuestion = question.trim();

    const newStudentMessage: Message = {
      role: "student",
      content: studentQuestion,
    };

    const now = new Date().toISOString();

    let chatId = currentChatId;

    if (!chatId) {
      chatId = createChatId();

      const newChat: Chat = {
        id: chatId,
        title: createChatTitle(studentQuestion),
        createdAt: now,
        updatedAt: now,
        subject,
        messages: [newStudentMessage],
      };

      setChats((previousChats) => [newChat, ...previousChats]);
      setCurrentChatId(chatId);
      setMessages([newStudentMessage]);
    } else {
      const currentChat = chats.find(
        (chat) => chat.id === chatId
      );

      const updatedMessages = [
        ...(currentChat?.messages || messages),
        newStudentMessage,
      ];

      const updatedChat: Chat = {
        id: chatId,
        title:
          currentChat?.title ||
          createChatTitle(studentQuestion),
        createdAt: currentChat?.createdAt || now,
        updatedAt: now,
        subject,
        messages: updatedMessages,
      };

      updateChat(updatedChat);
      setMessages(updatedMessages);
    }

    setQuestion("");
    setLoading(true);
    setError("");
    setDisplayedText("");

    try {
      const currentMessages =
        messages.length > 0
          ? [...messages, newStudentMessage]
          : [newStudentMessage];

      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          messages: currentMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong."
        );
      }

      const studifyMessage: Message = {
        role: "studify",
        content: data.answer,
      };

      const finalMessages = [
        ...currentMessages,
        studifyMessage,
      ];

      setMessages(finalMessages);

      if (chatId) {
        const existingChat = chats.find(
          (chat) => chat.id === chatId
        );

        const updatedChat: Chat = {
          id: chatId,
          title:
            existingChat?.title ||
            createChatTitle(studentQuestion),
          createdAt:
            existingChat?.createdAt || now,
          updatedAt: new Date().toISOString(),
          subject,
          messages: finalMessages,
        };

        updateChat(updatedChat);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Jelvo couldn't process your question."
      );
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    setCurrentChatId(null);
    setMessages([]);
    setQuestion("");
    setError("");
    setDisplayedText("");
    setIsTyping(false);
    setSubject("Statistics");
    setToolsOpen(false);
  }

  function openChat(chat: Chat) {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setSubject(chat.subject);
    setQuestion("");
    setError("");
    setDisplayedText("");
    setIsTyping(false);
    setToolsOpen(false);
  }

  function deleteChat(chatId: string) {
    const confirmed = window.confirm(
      "Delete this chat? This cannot be undone."
    );

    if (!confirmed) return;

    setChats((previousChats) =>
      previousChats.filter((chat) => chat.id !== chatId)
    );

    if (currentChatId === chatId) {
      startNewChat();
    }

    if (editingChatId === chatId) {
      setEditingChatId(null);
    }
  }

  function beginRename(chat: Chat) {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  }

  function saveRename(chatId: string) {
    const trimmedTitle = editingTitle.trim();

    if (!trimmedTitle) {
      setEditingChatId(null);
      return;
    }

    setChats((previousChats) =>
      previousChats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title: trimmedTitle,
            }
          : chat
      )
    );

    setEditingChatId(null);
    setEditingTitle("");
  }

  function toggleCategory(categoryName: string) {
    setOpenCategory(
      openCategory === categoryName
        ? ""
        : categoryName
    );
  }

  function handlePhotoUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setToolsOpen(false);

    setError(
      `Photo selected: ${file.name}. Photo analysis will be connected next.`
    );

    event.target.value = "";
  }

  const sortedChats = [...chats].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime()
  );

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#171512]">

      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-white transition-all duration-300 ease-in-out ${
          sidebarOpen
            ? "w-[320px] translate-x-0 border-r border-[#e4d9cc]"
            : "w-0 -translate-x-full border-r-0"
        }`}
      >
        {sidebarOpen && (
          <div className="flex h-full flex-col overflow-hidden">

            {/* SIDEBAR HEADER */}
            <div className="border-b border-[#eee5dc] p-5">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-2xl font-bold">
                    Jel
                    <span className="text-[#a9825a]">
                      vo
                    </span>
                  </h2>

                  <p className="mt-1 text-sm text-[#8b8175]">
                    A Student's AI
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSidebarOpen(false)
                  }
                  aria-label="Close sidebar"
                  className="rounded-xl p-2 text-lg text-[#8b8175] transition hover:bg-[#f5eee6] hover:text-[#171512]"
                >
                  ×
                </button>

              </div>

            </div>

            {/* SIDEBAR CONTENT */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">

              {/* SUBJECTS */}
              <div>

                <div className="mb-4 px-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#a9825a]">
                    Subjects
                  </p>
                </div>

                <div className="space-y-2">

                  {subjectCategories.map(
                    (category) => {

                      const isOpen =
                        openCategory === category.name;

                      return (
                        <div key={category.name}>

                          <button
                            onClick={() =>
                              toggleCategory(
                                category.name
                              )
                            }
                            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                              isOpen
                                ? "bg-[#f1e8de] text-[#171512]"
                                : "text-[#5f554b] hover:bg-[#faf8f5]"
                            }`}
                          >

                            <span>
                              {category.name}
                            </span>

                            <span
                              className={`text-[#a9825a] transition-transform ${
                                isOpen
                                  ? "rotate-90"
                                  : ""
                              }`}
                            >
                              ›
                            </span>

                          </button>

                          {isOpen && (
                            <div className="mt-2 space-y-1 pl-2">

                              {category.subjects.map(
                                (item) => {

                                  const isSelected =
                                    subject === item;

                                  return (
                                    <button
                                      key={item}
                                      onClick={() =>
                                        setSubject(item)
                                      }
                                      className={`w-full rounded-lg px-4 py-2.5 text-left text-sm transition ${
                                        isSelected
                                          ? "bg-[#a9825a] font-semibold text-white"
                                          : "text-[#746b61] hover:bg-[#f5eee6] hover:text-[#171512]"
                                      }`}
                                    >
                                      {item}
                                    </button>
                                  );
                                }
                              )}

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>
              </div>

              <div className="my-6 border-t border-[#eee5dc]" />

              {/* RECENT CHATS */}
              <div>

                <div className="mb-4 px-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#a9825a]">
                    Recent Chats
                  </p>
                </div>

                {sortedChats.length === 0 ? (
                  <div className="rounded-xl bg-[#faf8f5] p-4 text-center text-sm text-[#a49b91]">
                    Your saved chats will
                    appear here.
                  </div>
                ) : (
                  <div className="space-y-2">

                    {sortedChats.map((chat) => {

                      const isCurrent =
                        currentChatId === chat.id;

                      const isEditing =
                        editingChatId === chat.id;

                      return (
                        <div
                          key={chat.id}
                          className={`rounded-xl border transition ${
                            isCurrent
                              ? "border-[#c7a987] bg-[#f8f1e9]"
                              : "border-transparent hover:border-[#e4d9cc] hover:bg-[#faf8f5]"
                          }`}
                        >

                          {isEditing ? (
                            <div className="p-3">

                              <input
                                autoFocus
                                value={editingTitle}
                                onChange={(e) =>
                                  setEditingTitle(
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {

                                  if (
                                    e.key ===
                                    "Enter"
                                  ) {
                                    saveRename(
                                      chat.id
                                    );
                                  }

                                  if (
                                    e.key ===
                                    "Escape"
                                  ) {
                                    setEditingChatId(
                                      null
                                    );
                                    setEditingTitle(
                                      ""
                                    );
                                  }

                                }}
                                className="w-full rounded-lg border border-[#c7a987] bg-white px-3 py-2 text-sm text-[#171512] outline-none"
                              />

                              <div className="mt-2 flex gap-2">

                                <button
                                  onClick={() =>
                                    saveRename(
                                      chat.id
                                    )
                                  }
                                  className="rounded-lg bg-[#171512] px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                  Save
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingChatId(
                                      null
                                    );
                                    setEditingTitle(
                                      ""
                                    );
                                  }}
                                  className="rounded-lg bg-[#eee5dc] px-3 py-1.5 text-xs font-medium text-[#5f554b]"
                                >
                                  Cancel
                                </button>

                              </div>

                            </div>
                          ) : (
                            <div className="p-3">

                              <div className="flex items-start gap-2">

                                <button
                                  onClick={() =>
                                    openChat(chat)
                                  }
                                  className="min-w-0 flex-1 text-left"
                                >

                                  <p className="truncate text-sm font-semibold text-[#302b26]">
                                    {chat.title}
                                  </p>

                                  <p className="mt-1 text-[11px] leading-4 text-[#9a8f83]">
                                    {formatDateTime(
                                      chat.updatedAt
                                    )}
                                  </p>

                                </button>

                                <div className="flex shrink-0 gap-1">

                                  <button
                                    onClick={() =>
                                      beginRename(
                                        chat
                                      )
                                    }
                                    className="rounded-lg px-2 py-1 text-xs text-[#9a8f83] transition hover:bg-white hover:text-[#5f554b]"
                                    aria-label={`Rename ${chat.title}`}
                                  >
                                    ✎
                                  </button>

                                  <button
                                    onClick={() =>
                                      deleteChat(
                                        chat.id
                                      )
                                    }
                                    className="rounded-lg px-2 py-1 text-xs text-[#b09f91] transition hover:bg-red-50 hover:text-red-600"
                                    aria-label={`Delete ${chat.title}`}
                                  >
                                    ×
                                  </button>

                                </div>

                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })}

                  </div>
                )}

              </div>

            </div>

            {/* SIDEBAR FOOTER */}
            <div className="border-t border-[#eee5dc] bg-white p-4">

              {/* NEW CHAT */}
              <button
                onClick={startNewChat}
                className="flex w-full items-center justify-center rounded-xl bg-[#171512] px-4 py-3 font-semibold text-white transition hover:bg-[#2d2924]"
              >
                + New Chat
              </button>

              {/* UPGRADE TO PLUS */}
              <div className="mt-3">

                <CheckoutButton
                  planId={STUDIFY_PLUS_PLAN_ID}
                  planPeriod="month"
                  newSubscriptionRedirectUrl="/"
                >
                  <button className="w-full rounded-xl border border-[#c7a987] bg-[#f2e9df] px-4 py-3 text-sm font-semibold text-[#806548] transition hover:bg-[#eaded1]">
                    Upgrade to Plus
                    <span className="ml-1 font-normal">
                      · $10.99/mo
                    </span>
                  </button>
                </CheckoutButton>

              </div>

              {/* BRAND */}
              <p className="mt-4 text-center text-xs text-[#a49b91]">
                Jelvo • A Student's AI
              </p>

            </div>

          </div>
        )}
      </aside>

      {/* MAIN AREA */}
      <div
        className={`min-h-screen transition-all duration-300 ease-in-out ${
          sidebarOpen
            ? "lg:pl-[320px]"
            : "pl-0"
        }`}
      >

        {/* TOP BAR */}
        <header className="sticky top-0 z-30 border-b border-[#e7dfd4] bg-[#faf9f6]/95 px-6 py-4 backdrop-blur">

          <div className="mx-auto flex max-w-7xl items-center justify-between">

            <div className="flex items-center gap-3">

              {!sidebarOpen && (
                <button
                  onClick={() =>
                    setSidebarOpen(true)
                  }
                  aria-label="Open sidebar"
                  className="rounded-xl border border-[#d8cbbd] bg-white px-3 py-2 text-lg text-[#5f554b] transition hover:border-[#a9825a] hover:bg-[#f5eee6]"
                >
                  ☰
                </button>
              )}

              {!sidebarOpen && (
                <div>

                  <h1 className="text-2xl font-bold">
                    Jel
                    <span className="text-[#a9825a]">
                      vo
                    </span>
                  </h1>

                  <p className="text-xs text-[#8b8175]">
                    A Student's AI
                  </p>

                </div>
              )}

              {sidebarOpen && (
                <p className="text-sm text-[#8b8175]">
                  {subject}
                </p>
              )}

            </div>

            {/* ACCOUNT AREA */}
            <div className="flex items-center gap-2">

              <Show when="signed-out">

                <SignInButton mode="modal">
                  <button className="rounded-xl px-4 py-2 text-sm font-medium text-[#5f554b] transition hover:bg-[#f5eee6]">
                    Log in
                  </button>
                </SignInButton>

                <SignUpButton mode="modal">
                  <button className="rounded-xl bg-[#171512] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2924]">
                    Create account
                  </button>
                </SignUpButton>

              </Show>

              <Show when="signed-in">

                <UserButton
                  showName
                  appearance={{
                    elements: {
                      userButtonBox:
                        "rounded-xl",
                    },
                  }}
                />

              </Show>

            </div>

          </div>

        </header>

        {/* PAGE CONTENT */}
        <div className="mx-auto max-w-7xl px-6 py-8">

          {/* HERO */}
          {messages.length === 0 && (
            <section className="mx-auto max-w-4xl py-10 text-center">

              <div className="mb-6 inline-block rounded-full border border-[#d8c4ad] bg-[#f2e9df] px-4 py-2 text-sm font-medium text-[#806548]">
                Learn the steps. Understand
                the answer.
              </div>

              <h2 className="text-5xl font-bold tracking-tight sm:text-6xl">
                Your personal

                <span className="block text-[#a9825a]">
                  AI tutor.
                </span>
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#746b61]">
                Ask questions, get help with
                school, or just talk. Jelvo is
                built around the way students
                actually learn.
              </p>

            </section>
          )}

          {/* DIVIDER */}
          <div
            className={
              messages.length === 0
                ? "border-t border-[#e7dfd4] pt-10"
                : "mt-8"
            }
          >

            {/* CONVERSATION */}
            {messages.length > 0 && (
              <section className="mx-auto max-w-4xl space-y-7">

                {messages.map((message, index) => {

                  const isLastStudifyMessage =
                    message.role === "studify" &&
                    index ===
                      messages.length - 1;

                  const content =
                    isLastStudifyMessage
                      ? displayedText
                      : message.content;

                  return (
                    <div
                      key={index}
                      className={
                        message.role ===
                        "student"
                          ? "ml-auto max-w-2xl rounded-3xl bg-[#171512] p-5 text-white shadow-sm"
                          : "max-w-3xl rounded-3xl border border-[#e4d9cc] bg-white p-7 shadow-sm"
                      }
                    >

                      <div
                        className={`mb-3 text-sm font-semibold ${
                          message.role ===
                          "student"
                            ? "text-[#d8b994]"
                            : "text-[#a9825a]"
                        }`}
                      >
                        {message.role ===
                        "student"
                          ? "You"
                          : "Jelvo"}
                      </div>

                      <div
                        className={`whitespace-pre-wrap leading-8 ${
                          message.role ===
                          "student"
                            ? "text-white"
                            : "text-[#302b26]"
                        }`}
                      >
                        {content}

                        {isLastStudifyMessage &&
                          isTyping && (
                            <span className="ml-1 inline-block h-5 w-1 animate-pulse bg-[#a9825a]" />
                          )}
                      </div>

                    </div>
                  );
                })}

                {/* THINKING */}
                {loading && (
                  <div className="max-w-3xl rounded-3xl border border-[#e4d9cc] bg-white p-6 shadow-sm">

                    <div className="flex items-center gap-3">

                      <div className="flex gap-1">

                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#a9825a]" />

                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#a9825a] [animation-delay:150ms]" />

                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#a9825a] [animation-delay:300ms]" />

                      </div>

                      <span className="text-sm text-[#8b8175]">
                        Jelvo is thinking...
                      </span>

                    </div>

                  </div>
                )}

              </section>
            )}

            {/* INPUT */}
            <section
              className={`mx-auto max-w-4xl ${
                messages.length > 0
                  ? "mt-8"
                  : ""
              }`}
            >

              <div className="rounded-3xl border border-[#ded3c7] bg-white p-5 shadow-sm">

                <div className="relative">

                  {/* TOOLS BUTTON */}
                  <div className="absolute left-3 top-3 z-20">

                    <button
                      type="button"
                      onClick={() =>
                        setToolsOpen(!toolsOpen)
                      }
                      aria-label="Open tools"
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition ${
                        toolsOpen
                          ? "border-[#a9825a] bg-[#f5eee6] text-[#806548]"
                          : "border-[#ded3c7] bg-white text-[#5f554b] hover:border-[#a9825a] hover:bg-[#f5eee6]"
                      }`}
                    >
                      +
                    </button>

                    {/* TOOLS MENU */}
                    {toolsOpen && (
                      <div className="absolute bottom-12 left-0 w-60 overflow-hidden rounded-2xl border border-[#e4d9cc] bg-white p-2 shadow-xl">

                        <button
                          type="button"
                          onClick={() =>
                            fileInputRef.current?.click()
                          }
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#f5eee6]"
                        >

                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f2e9df] text-lg">
                            📷
                          </span>

                          <span>
                            <span className="block text-sm font-semibold text-[#302b26]">
                              Add photos
                            </span>

                            <span className="block text-xs text-[#9a8f83]">
                              Upload homework or images
                            </span>
                          </span>

                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setToolsOpen(false);
                            setError(
                              "Web Search will be connected next."
                            );
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#f5eee6]"
                        >

                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f2e9df] text-lg">
                            🌐
                          </span>

                          <span>
                            <span className="block text-sm font-semibold text-[#302b26]">
                              Web Search
                            </span>

                            <span className="block text-xs text-[#9a8f83]">
                              Search the internet
                            </span>
                          </span>

                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setToolsOpen(false);
                            setError(
                              "File uploads will be connected next."
                            );
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#f5eee6]"
                        >

                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f2e9df] text-lg">
                            📄
                          </span>

                          <span>
                            <span className="block text-sm font-semibold text-[#302b26]">
                              Upload file
                            </span>

                            <span className="block text-xs text-[#9a8f83]">
                              PDF, Word, and more
                            </span>
                          </span>

                        </button>

                      </div>
                    )}

                  </div>

                  {/* PHOTO INPUT */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  {/* TEXT BOX */}
                  <textarea
                    value={question}
                    onChange={(e) =>
                      setQuestion(
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey
                      ) {
                        e.preventDefault();
                        askStudify();
                      }
                    }}
                    placeholder={`Ask Jelvo about ${subject.toLowerCase()}...`}
                    className="min-h-36 w-full resize-none rounded-2xl border border-[#e1d8ce] bg-[#fcfbf9] p-5 pl-16 text-lg text-[#171512] outline-none transition placeholder:text-[#a49b91] focus:border-[#a9825a] focus:ring-2 focus:ring-[#a9825a]/10"
                  />

                </div>

                <div className="mt-4 flex items-center justify-between">

                  <p className="text-xs text-[#a49b91]">
                    {subject} • Enter to send
                  </p>

                  <button
                    onClick={askStudify}
                    disabled={
                      loading ||
                      !question.trim()
                    }
                    className="rounded-xl bg-[#171512] px-6 py-3 font-semibold text-white transition hover:bg-[#2d2924] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading
                      ? "Thinking..."
                      : "Ask Jelvo →"}
                  </button>

                </div>

              </div>

              {/* ERROR */}
              {error && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">

                  <p className="font-semibold text-red-700">
                    Something went wrong
                  </p>

                  <p className="mt-2 text-sm text-red-600">
                    {error}
                  </p>

                </div>
              )}

            </section>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="border-t border-[#e7dfd4] py-8 text-center text-sm text-[#a49b91]">
          Jelvo • A Student's AI
        </footer>

      </div>
    </main>
  );
}