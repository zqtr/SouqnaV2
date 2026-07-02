import {
  Button,
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
  Spinner,
} from 'souqna';
import { ArrowUp, Paperclip } from 'lucide-react';

export const Composer = () => (
  <div style={{ width: '100%', maxWidth: 560, padding: 8 }}>
    <PromptInput value="" onValueChange={() => {}}>
      <PromptInputTextarea placeholder="Ask Souqy…" />
      <PromptInputActions style={{ justifyContent: 'space-between', paddingTop: 8 }}>
        <PromptInputAction tooltip="Attach a product photo">
          <Button variant="ghost" size="icon" style={{ borderRadius: 9999 }}>
            <Paperclip />
          </Button>
        </PromptInputAction>
        <PromptInputAction tooltip="Send">
          <Button size="icon" style={{ borderRadius: 9999 }}>
            <ArrowUp />
          </Button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  </div>
);

export const Generating = () => (
  <div style={{ width: '100%', maxWidth: 560, padding: 8 }}>
    <PromptInput
      isLoading
      value="Write a launch post for my oud perfume collection"
      onValueChange={() => {}}
    >
      <PromptInputTextarea placeholder="Ask Souqy…" />
      <PromptInputActions style={{ justifyContent: 'flex-end', paddingTop: 8 }}>
        <PromptInputAction tooltip="Generating…">
          <Button size="icon" style={{ borderRadius: 9999 }} disabled>
            <Spinner />
          </Button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  </div>
);
