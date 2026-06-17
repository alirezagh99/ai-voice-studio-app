export interface GeneratedAudio {
  audioUrl: string; // Cloudinary URL (final playable file)
  voiceUrl: string; // source voice used for cloning
  text: string;
  language: string;
  exaggeration: number;
  cfgWeight: number;
  timestamp: Date;
}

export interface VoiceFile {
  name: string;
  url: string; // Cloudinary URL
  publicId: string; // Cloudinary delete/manage ID
}

export interface VoiceAsset {
  id: string;
  name: string;
  url: string; // Cloudinary URL
  publicId: string; // Cloudinary identifier
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}
