import type {IssueCode, PoseIssue} from '@/lib/fit/retake';

export const TIPS: Record<IssueCode, string> = {
  'no-front': "We couldn't find a person in the front photo. Try a plain background and even light.",
  'too-small': 'Stand farther back so your whole body, head to feet, fills the frame.',
  'feet-cropped': 'Your feet are cut off. Step back or tilt the phone down so both feet show.',
  'head-low': 'Your head sits low in the frame. Move back or lower the phone a little.',
  'arms-blocking': "Your arms are covering your waist. Hold them a hand's width away from your body.",
  'shoulders-unclear': "We couldn't see your shoulders clearly. Face the camera in fitted clothes and even light.",
  'side-frontal': 'The side photo looks like a front view. Turn fully to one side.',
  'side-feet': 'Side photo: your feet are cut off. Stand at the same distance as for the front photo.',
  'no-side': 'Without a side photo, bust, waist and hip are less certain.',
};

export function PoseTips({issues}: {issues: PoseIssue[]}) {
  if (!issues.length) return null;
  return <ul className="fit-warnings" role="alert">{issues.map(i => <li key={i.code}><strong>{i.hard ? 'Retake: ' : 'Tip: '}</strong>{TIPS[i.code]}</li>)}</ul>;
}
