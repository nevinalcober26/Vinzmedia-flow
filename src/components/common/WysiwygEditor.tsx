"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link as LinkIcon,
  Eraser,
  Minus,
  Eye,
  Code2,
  Sparkles,
} from "lucide-react";

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = "Write description, context, acceptance criteria, or checklists...",
  minHeight = "130px",
  className = "",
}: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isRawMode, setIsRawMode] = useState(false);
  const [rawText, setRawText] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // Synchronize incoming value into editor innerHTML safely
  useEffect(() => {
    if (editorRef.current && !isRawMode) {
      if (editorRef.current.innerHTML !== value) {
        // If value has no HTML tags but has newlines, format line breaks
        if (value && !value.includes("<") && value.includes("\n")) {
          editorRef.current.innerHTML = value.replace(/\n/g, "<br>");
        } else {
          editorRef.current.innerHTML = value || "";
        }
      }
    }
    setRawText(value || "");
    updateWordCount(value || "");
  }, [value, isRawMode]);

  const updateWordCount = (text: string) => {
    const plain = text.replace(/<[^>]*>/g, " ").trim();
    const count = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
    setWordCount(count);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setRawText(html);
      updateWordCount(html);
    }
  };

  const handleRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawText(val);
    onChange(val);
    updateWordCount(val);
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (isRawMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleInsertLink = () => {
    if (isRawMode) return;
    const url = prompt("Enter URL (e.g. https://github.com):");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const handleInsertChecklist = () => {
    if (isRawMode) return;
    const checkItem = `<div><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" style="width:14px;height:14px;accent-color:#4f46e5;" /> <span>Checklist task item...</span></label></div>`;
    executeCommand("insertHTML", checkItem);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Standard text formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        executeCommand("bold");
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        executeCommand("italic");
      } else if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        executeCommand("underline");
      }
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-background/60 shadow-xs ${
        isFocused
          ? "border-primary/80 ring-2 ring-primary/20 bg-background"
          : "border-border/80 hover:border-border"
      } ${className}`}
    >
      {/* WYSIWYG Formatting Ribbon Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-2.5 py-1.5 border-b border-border/70 bg-muted/40 backdrop-blur-xs select-none">
        <div className="flex flex-wrap items-center gap-0.5">
          {/* Bold */}
          <button
            type="button"
            onClick={() => executeCommand("bold")}
            disabled={isRawMode}
            title="Bold (Ctrl+B / Cmd+B)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => executeCommand("italic")}
            disabled={isRawMode}
            title="Italic (Ctrl+I / Cmd+I)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => executeCommand("underline")}
            disabled={isRawMode}
            title="Underline (Ctrl+U / Cmd+U)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onClick={() => executeCommand("strikeThrough")}
            disabled={isRawMode}
            title="Strikethrough"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-border/80 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<h1>")}
            disabled={isRawMode}
            title="Large Heading (H1)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors font-bold text-xs"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<h2>")}
            disabled={isRawMode}
            title="Medium Heading (H2)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<h3>")}
            disabled={isRawMode}
            title="Subheading (H3)"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-border/80 mx-1" />

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => executeCommand("insertUnorderedList")}
            disabled={isRawMode}
            title="Bullet List"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          {/* Ordered List */}
          <button
            type="button"
            onClick={() => executeCommand("insertOrderedList")}
            disabled={isRawMode}
            title="Numbered List"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          {/* Checklist Task Item */}
          <button
            type="button"
            onClick={handleInsertChecklist}
            disabled={isRawMode}
            title="Interactive Checklist Item"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-border/80 mx-1" />

          {/* Blockquote */}
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<blockquote>")}
            disabled={isRawMode}
            title="Quote"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          {/* Code */}
          <button
            type="button"
            onClick={() => executeCommand("formatBlock", "<pre>")}
            disabled={isRawMode}
            title="Code Block"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          {/* Link */}
          <button
            type="button"
            onClick={handleInsertLink}
            disabled={isRawMode}
            title="Insert Link"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          {/* Divider */}
          <button
            type="button"
            onClick={() => executeCommand("insertHorizontalRule")}
            disabled={isRawMode}
            title="Horizontal Divider"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-40 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Clear format */}
          <button
            type="button"
            onClick={() => executeCommand("removeFormat")}
            disabled={isRawMode}
            title="Clear Formatting"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-40 transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Mode Switcher (Visual WYSIWYG vs Raw Code) */}
        <div className="flex items-center space-x-1 border-l border-border/70 pl-2">
          <button
            type="button"
            onClick={() => {
              if (isRawMode && editorRef.current) {
                editorRef.current.innerHTML = rawText;
              }
              setIsRawMode(!isRawMode);
            }}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
              isRawMode
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            title={isRawMode ? "Switch to Visual WYSIWYG" : "Switch to Raw HTML/Markdown"}
          >
            {isRawMode ? <Eye className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
            <span>{isRawMode ? "Visual" : "Code"}</span>
          </button>
        </div>
      </div>

      {/* Main Editing Surface */}
      <div className="relative p-3">
        {isRawMode ? (
          <textarea
            value={rawText}
            onChange={handleRawChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/60 resize-y focus:outline-hidden leading-relaxed"
          />
        ) : (
          <div className="relative">
            {/* Visual contentEditable WYSIWYG container */}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={{ minHeight }}
              className="w-full text-xs text-foreground focus:outline-hidden leading-relaxed prose prose-sm dark:prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none"
              data-placeholder={placeholder}
            />
          </div>
        )}
      </div>

      {/* Footer Word & Character Counter */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-muted/20 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1 font-medium">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>Rich WYSIWYG Editor</span>
        </span>
        <span>
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
      </div>
    </div>
  );
}
