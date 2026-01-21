/**
 * Ethos API client for Frame integration
 */
import { Ethos } from 'ethos-ts-sdk';

// Initialize Ethos client
const ethos = new Ethos();

export interface EthosProfileData {
  id: number;
  username?: string;
  displayName?: string;
  score: number;
  scoreLevel: string;
  vouchesReceived: number;
  vouchesGiven: number;
  ethStaked: number; // in ETH
  avatarUrl?: string;
}

/**
 * Get Ethos profile by Twitter/X handle
 */
export async function getEthosProfile(handle: string): Promise<EthosProfileData | null> {
  try {
    const profile = await ethos.profiles.getByTwitter(handle);

    // Convert wei to ETH
    const ethStaked = profile.stats.vouch.received.amountWeiTotal / 1e18;

    return {
      id: profile.id,
      username: profile.username || profile.twitterHandle,
      displayName: profile.displayName,
      score: profile.score,
      scoreLevel: profile.scoreLevel,
      vouchesReceived: profile.vouchesReceivedCount,
      vouchesGiven: profile.vouchesGivenCount,
      ethStaked: ethStaked,
      avatarUrl: profile.avatarUrl,
    };
  } catch (error) {
    console.error('Failed to fetch Ethos profile:', error);
    return null;
  }
}

/**
 * Get score level label for display
 */
export function getScoreLevelLabel(level: string): { label: string; color: string; emoji: string } {
  switch (level) {
    case 'exemplary':
      return { label: 'EXEMPLARY', color: '#22c55e', emoji: '🏆' };
    case 'reputable':
      return { label: 'REPUTABLE', color: '#3b82f6', emoji: '⭐' };
    case 'neutral':
      return { label: 'NEUTRAL', color: '#737373', emoji: '➖' };
    case 'questionable':
      return { label: 'QUESTIONABLE', color: '#f97316', emoji: '⚠️' };
    case 'untrusted':
      return { label: 'UNTRUSTED', color: '#ef4444', emoji: '🚨' };
    default:
      return { label: 'UNKNOWN', color: '#737373', emoji: '❓' };
  }
}
