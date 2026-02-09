/**
 * Citadel Hub - WhatsApp Clone
 * Main export file for easy imports
 */

// Main Component
export { CitadelHub } from './CitadelHub';

// Individual Components (if you want to use them separately)
export { Header } from './header';
export { SearchAndFilter } from './searchAndFilter';
export { List } from './list';
export { Chat } from './chat';
export { ChatDetails } from './chatDetails';
export { NewChat } from './newChat';
export { NewGroup } from './newGroup';
export { Edit } from './edit';
export { EmojiPicker } from './emojiPicker';
export { AttachmentMenu } from './attachmentMenu';

// Styles
import './styles.css';

/**
 * Usage:
 * 
 * import { CitadelHub } from './citadel_hub';
 * 
 * <CitadelHub
 *   apiBaseUrl="http://localhost:8000/api/chat"
 *   wsBaseUrl="ws://localhost:8000"
 *   token={authToken}
 *   currentUser={currentUser}
 * />
 */
