import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Bot,
  User,
  AlertTriangle,
  ShieldCheck,
  Pill,
  ChevronRight,
  ExternalLink,
  Activity,
  HeartPulse,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import apiClient from '../../api/client';

export const AIAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        'Hello! I am **ClariMed AI Assistant**.\n\nYou can describe your symptoms (e.g. *headache, vomiting, dizziness*), and I will cross-reference your verified prescriptions and lab tests to provide clinical context, triage guidance, and safety recommendations.',
      triage_level: 'routine',
      relevant_medications: [],
      suggested_actions: ['Ask about a symptom', 'Check prescription side-effects'],
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const starterPrompts = [
    'I have a headache and nausea after taking my blood pressure medicine.',
    'Should I increase or decrease my medicine dose if I feel dizzy?',
    'Explain how my recent lab biomarkers correlate with my current drugs.',
    'I am vomiting and feeling weak — what should I do next?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await apiClient.post('/assistant/chat', {
        message: query.trim(),
        chat_history: historyPayload,
      });

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.data.response,
        triage_level: response.data.triage_level || 'routine',
        relevant_medications: response.data.relevant_medications || [],
        suggested_actions: response.data.suggested_actions || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI Assistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            'I encountered a brief connection issue. However, please remember: **Do NOT alter your medication dosage on your own.** If you are feeling unwell, please consult your doctor or visit the nearest clinic immediately.',
          triage_level: 'consult_doctor',
          relevant_medications: [],
          suggested_actions: ['Consult Doctor', 'Do Not Alter Doses'],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-full shadow-lg shadow-brand-600/30 hover:shadow-xl transition-all duration-300 group cursor-pointer"
          aria-label="Open ClariMed AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></span>
          </div>
          <span className="font-semibold text-xs tracking-wide">Ask ClariMed AI</span>
        </button>
      )}

      {/* Interactive Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[440px] h-[620px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-brand-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 text-white px-5 py-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-amber-300 shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-tight">ClariMed AI Assistant</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-300/30">
                    RAG Grounded
                  </span>
                </div>
                <p className="text-[11px] text-brand-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified Record Context
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Safety Subheader Banner */}
          <div className="bg-amber-50/90 border-b border-amber-200/60 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-900 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Non-Diagnostic • Never Adjust Doses Independently
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-xs shadow-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  {/* Triage Badge for Assistant Messages */}
                  {msg.role === 'assistant' && msg.triage_level && (
                    <div className="mb-2.5">
                      {msg.triage_level === 'emergency' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-bold border border-red-200">
                          <AlertOctagon className="w-3 h-3 text-red-600" /> Emergency Triage: Seek Immediate Care
                        </span>
                      )}
                      {msg.triage_level === 'consult_doctor' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Doctor Consultation Advised
                        </span>
                      )}
                    </div>
                  )}

                  {/* Formatted Message Body */}
                  <div className="space-y-2 whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Relevant Medications Chips */}
                  {msg.relevant_medications && msg.relevant_medications.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <Pill className="w-3 h-3 text-brand-600" /> Related Regimen:
                      </span>
                      {msg.relevant_medications.map((med, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[10px] font-medium border border-brand-200/70"
                        >
                          {med}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5 animate-spin">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-xs p-3.5 text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] font-medium text-slate-600">Cross-referencing verified prescriptions...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Prompts */}
          {messages.length <= 2 && (
            <div className="p-2.5 bg-slate-100/70 border-t border-slate-200/80 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-1">
                Suggested Questions:
              </span>
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left text-[11px] text-brand-900 bg-white hover:bg-brand-50 hover:border-brand-300 px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate">{prompt}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-brand-600 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Describe symptoms (e.g. vomiting, headache)..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-all cursor-pointer shadow-xs shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
