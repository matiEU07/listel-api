// gmail.ts
import { google } from 'googleapis';
import { ParsedMail, simpleParser } from 'mailparser';
import CONFIG from './config';

const oauth2Client = new google.auth.OAuth2(
    CONFIG.GOOGLE.CLIENT_ID,
    CONFIG.GOOGLE.CLIENT_SECRET,
    CONFIG.GOOGLE.REDIRECT_URI
);

interface GmailConfig {
    accessToken: string;
    refreshToken: string;
    pageToken?: string; // Add pageToken for pagination
}

export const gmail_getPaginatedMails = async (
    config: GmailConfig,
    pagination: number,
    page: number = 1
): Promise<any> => {
    try {
        // Set credentials
        oauth2Client.setCredentials({
            access_token: config.accessToken,
            refresh_token: config.refreshToken
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // List messages (get IDs first)
        const listResponse = await gmail.users.messages.list({
            userId: 'me',
            maxResults: pagination,
            pageToken: config.pageToken // Use pageToken for pagination
        });

        const messages = listResponse.data.messages || [];
        
        if (messages.length === 0) {
            return {
                emails: [],
                nextPageToken: null
            };
        }

        // Fetch full message data for each message in parallel (faster)
        const messagePromises = messages.map(async (message) => {
            if (!message.id) return null;

            const fullMessage = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'raw'
            });

            if (fullMessage.data.raw) {
                // Decode base64url encoded message
                const rawMessage = Buffer.from(
                    fullMessage.data.raw.replace(/-/g, '+').replace(/_/g, '/'),
                    'base64'
                ).toString('utf-8');

                // Parse the email
                return await simpleParser(rawMessage);
            }
            return null;
        });

        const results = await Promise.all(messagePromises);
        
        // Filter out any null values
        const parsedMails: ParsedMail[] = results.filter((mail): mail is ParsedMail => mail !== null);

        return {
            emails: parsedMails,
            nextPageToken: listResponse.data.nextPageToken || null
        };
    } catch (error) {
        console.error('Gmail API Error:', error);
        throw error;
    }
};

// Generate OAuth URL for user to authorize
export const getGmailAuthUrl = (): string => {
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Force to get refresh token
    });
};

// Exchange authorization code for tokens
export const getGmailTokens = async (code: string) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        
        // Get user's email address
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        return {
            ...tokens,
            email: userInfo.data.email
        };
    } catch (error) {
        console.error('Error getting Gmail tokens:', error);
        throw error;
    }
};

// Refresh access token using refresh token
export const refreshGmailToken = async (refreshToken: string) => {
    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
};

export default gmail_getPaginatedMails;