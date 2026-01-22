export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-secondary rounded-2xl rounded-bl-md w-fit">
      <div className="flex gap-1">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
      <span className="text-sm text-muted-foreground">StudyBuddy is thinking...</span>
    </div>
  );
}
