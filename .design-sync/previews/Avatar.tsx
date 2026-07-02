import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from 'souqna';

export const CustomerAvatars = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/80?img=12" alt="Maryam Al-Sulaiti" />
      <AvatarFallback>MA</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>س</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/80?img=32" alt="Khalid Al-Marri" />
      <AvatarFallback>KM</AvatarFallback>
      <AvatarBadge />
    </Avatar>
  </div>
);

export const SizeSweep = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <Avatar size="sm">
      <AvatarImage src="https://i.pravatar.cc/80?img=5" alt="Noora Al-Kuwari" />
      <AvatarFallback>NK</AvatarFallback>
    </Avatar>
    <Avatar size="default">
      <AvatarImage src="https://i.pravatar.cc/80?img=5" alt="Noora Al-Kuwari" />
      <AvatarFallback>NK</AvatarFallback>
    </Avatar>
    <Avatar size="lg">
      <AvatarImage src="https://i.pravatar.cc/80?img=5" alt="Noora Al-Kuwari" />
      <AvatarFallback>NK</AvatarFallback>
    </Avatar>
  </div>
);

export const StaffGroup = () => (
  <AvatarGroup>
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/80?img=15" alt="Yousef Al-Thani" />
      <AvatarFallback>YT</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/80?img=25" alt="Aisha Al-Emadi" />
      <AvatarFallback>AE</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>ح</AvatarFallback>
    </Avatar>
    <AvatarGroupCount>+4</AvatarGroupCount>
  </AvatarGroup>
);
