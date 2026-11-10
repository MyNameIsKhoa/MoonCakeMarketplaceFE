# Human conversation widget integration

`FloatingChatWidget` reuses the authenticated account's existing RFQ conversations,
`ConversationsView`, `ChatPanel`, and `useChatThread`. Mount it once under
`AuthProvider`. It shows a single-column paginated inbox or the selected thread,
with its RFQ context. It renders nothing when closed or logged out.

```ts
interface FloatingChatWidgetProps {
  open: boolean;
  onClose: () => void;
  conversationId?: string | null;
  onSelectConversation?: (conversationId: string | null) => void;
  onOpenRfq?: (rfqId: string) => void;
}
```

App owns `open` and the externally selected conversation. Connect the optional
selection callback when App stores that ID so the back button clears App's state
and repeated RFQ actions can reopen the same thread. Without the callback the
widget still supports local selection. Close clears selection; minimize retains
the selected ID, draft, pending sends and connection, and shows a restore button
with the unread total. Hidden threads do not mark incoming messages read. Close,
logout and account changes unmount the thread and dispose its connection/timers.

In App's component inside `AuthProvider` (adjust import paths to its location):

```tsx
import FloatingChatWidget from './features/chat/FloatingChatWidget';
import {
  OPEN_CONVERSATION_CHAT_EVENT,
  type OpenConversationChatDetail,
} from './features/chat/chatWidgetEvents';

const { isAuthenticated, user } = useAuth();
const accountId = isAuthenticated && user ? String(user.userId) : null;
const [chatOpen, setChatOpen] = useState(false);
const [chatConversationId, setChatConversationId] = useState<string | null>(null);

useEffect(() => {
  setChatOpen(false);
  setChatConversationId(null);
}, [accountId]);

useEffect(() => {
  const openChat = (event: Event) => {
    if (!accountId) return;
    const detail = (event as CustomEvent<OpenConversationChatDetail>).detail;
    setChatConversationId(detail.conversationId);
    setChatOpen(true);
  };
  window.addEventListener(OPEN_CONVERSATION_CHAT_EVENT, openChat);
  return () => window.removeEventListener(OPEN_CONVERSATION_CHAT_EVENT, openChat);
}, [accountId]);

// Include this once in App's JSX:
<FloatingChatWidget
  open={chatOpen}
  onClose={() => { setChatOpen(false); setChatConversationId(null); }}
  conversationId={chatConversationId}
  onSelectConversation={setChatConversationId}
  onOpenRfq={(rfqId) => {
    setChatOpen(false);
    setChatConversationId(null);
    // Navigate to the existing RFQ detail view using this exact rfqId.
    // Use the App/RfqPortal owner's existing route/state mechanism here.
  }}
/>
```

There is no invented RFQ URL. Omit `onOpenRfq` until App has a working RFQ detail
handler; the RFQ context subtitle remains visible and the navigation button is
omitted. `onOpenRfq` does not close automatically; the host controls navigation
and visibility as in the example.

Navbar's human-messages icon can call `openConversationChat()` to open the inbox
(or call the same App state setters). The helper also restores an already
minimized widget. RFQ UI calls it **after** the existing API returns the account's
conversation ID:

```tsx
import { openConversationChat } from '../chat/chatWidgetEvents'; // from RfqPortal

const openConversation = (id: string) => openConversationChat(id);
// Keep passing onOpenConversation={openConversation} to RfqDetail.
// RfqDetail already calls conversationApi.open(rfqId, supplierId) and returns its ID.
```

The helper dispatches a window `CustomEvent<OpenConversationChatDetail>` named
`mooncake:open-conversation-chat` with `detail: { conversationId: string | null }`.
`openConversationChat(id?: string)` trims the ID; absent/empty means inbox. Use
the returned **conversationId**, not rfqId or supplierId. Avoid also navigating to
the inline messages tab for the same action, which would mount a second thread.

Existing APIs provide an account-wide unread message total. The widget polls it
every 10 seconds while visible, refreshes on focus/visibility/read events, and
shows it in expanded and minimized headers. There is no per-thread unread field
in the current conversation DTO. No backend changes or additional dependencies.

Independent checks (run from MoonCakeMarketFrontend):

```sh
node --test src/features/chat/chat.test.mjs
npm run lint
npm run build
```

If the default Vite config loader stalls in the sandbox, the equivalent production
build with its runner loader is `node node_modules/vite/bin/vite.js build --configLoader runner`.
