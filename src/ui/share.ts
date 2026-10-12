import type { GameRecord } from './storage';

/** The site's public address. */
export const SITE_URL = 'dailyvgc.online';

/** Address shown in the share text. Set VITE_SITE_URL at build time to override. */
export function siteUrl(): string {
	const configured = import.meta.env?.VITE_SITE_URL as string | undefined;
	return (configured || SITE_URL).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function shareText(record: GameRecord, streak: number, hard = false, archive = false): string {
	const boxes = record.alive.map(a => (a ? '🟩' : '🟥')).join('');
	const left = record.alive.filter(Boolean).length;
	const tags = [hard && 'Hard Mode', archive && 'Archive'].filter(Boolean).join(', ');
	return [
		`Daily VGC #${record.number}${tags ? ` (${tags})` : ''}`,
		`${boxes} ${left}/4 left · ${record.turns} turns`,
		archive ? '#DailyVGC' : `Streak: ${streak} · #DailyVGC`,
		siteUrl(),
	].join('\n');
}

function isMobile() {
	return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
		(navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

/**
 * On phones, open the native share sheet (Messages etc.); elsewhere, copy to the clipboard.
 * Returns what happened so the UI can confirm it.
 */
export async function shareResult(text: string): Promise<'shared' | 'copied' | 'failed'> {
	if (isMobile() && navigator.share) {
		try {
			await navigator.share({ text });
			return 'shared';
		} catch (e: any) {
			if (e?.name === 'AbortError') return 'failed';
		}
	}
	try {
		await navigator.clipboard.writeText(text);
		return 'copied';
	} catch {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand('copy');
		ta.remove();
		return ok ? 'copied' : 'failed';
	}
}

/** sms: link with the text prefilled, for a direct "Text a friend" button on phones. */
export function smsLink(text: string): string {
	const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
	return `sms:${ios ? '&' : '?'}body=${encodeURIComponent(text)}`;
}

export { isMobile };
