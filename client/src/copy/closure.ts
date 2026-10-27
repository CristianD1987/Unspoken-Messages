export const closureCopy = {
  confirmTitle: (name: string) => `Find closure with ${name}?`,
  confirmBody: 'Your words stay saved here, but no new messages can be added.',
  confirmWarning: "This is permanent and can't be undone.",
  confirmReassurance: (name: string) =>
    `You can always start a new conversation with ${name} later.`,
  markClosure: 'Mark closure',
  closureCta: 'Said everything? Find closure',
  dividerLabel: (closedOn?: string) =>
    closedOn && String(closedOn).trim() ? `CLOSURE · ${closedOn}` : 'CLOSURE',
  cardTitle: 'You found closure',
  cardBody:
    'You said what you needed to say. Your words stay here, safe, but you no longer have to carry them.',
  startNewConversation: (name: string) => `Start a new conversation with ${name}`,
} as const;
