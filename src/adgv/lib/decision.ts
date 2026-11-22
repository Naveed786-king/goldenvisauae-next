// Wording for the authority decision on a client file (admin, client portal, messages).
export const DECISION_TEXT: Record<string, { title: string; client: string }> = {
  approved: { title: 'Approved', client: 'Good news: your application has been approved by the authorities.' },
  rejected: { title: 'Not approved', client: 'The authorities did not approve your application this time.' },
  on_hold: { title: 'On hold', client: 'Your application is on hold with the authorities.' },
  withdrawn: { title: 'Withdrawn', client: 'Your application has been withdrawn.' },
};

export const DECISION_PILL: Record<string, string> = { approved: 'ok', rejected: 'closed', on_hold: 'due', withdrawn: 'closed' };
