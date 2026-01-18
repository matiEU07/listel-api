// imap.ts
import Imap from "imap";
import { ParsedMail, simpleParser } from "mailparser";
import { Readable } from 'stream';

interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
}

export const imap_getPaginatedMails = async (
    config: ImapConfig,
    pagination: number,
    page: number = 1
): Promise<ParsedMail[]> => {
    return new Promise((resolve, reject) => {
        const imap = new Imap(config);

        imap.once("ready", async () => {
            try {
                const mailbox = await openInbox(imap);
                const total = mailbox.messages.total;

                const start = total - (pagination * page) + 1
                const end = total - (pagination * (page - 1))

                console.log(`total = ${total} start = ${start} end = ${end}`)

                const range = `${start < 1 ? 1 : start}:${end}`;
                const parsedMails: ParsedMail[] = [];
                const parsePromises: Promise<void>[] = [];

                const fetch = imap.seq.fetch(range, { bodies: '', struct: true });

                fetch.on('message', (msg) => {
                    msg.on('body', (stream) => {
                        const parsePromise = simpleParser(stream as Readable)
                            .then((mail) => {
                                parsedMails.push(mail);
                            })
                            .catch(reject);

                        parsePromises.push(parsePromise);
                    });
                });

                fetch.once('error', reject);
                fetch.once('end', async () => {
                    try {
                        await Promise.all(parsePromises);
                        imap.end();
                        resolve(parsedMails);
                    } catch (e) {
                        imap.end();
                        reject(e);
                    }
                });

            } catch (err) {
                imap.end();
                reject(err);
            }
        });

        imap.once('error', (err: any) => reject(err));
        imap.connect();
    });
};

const openInbox = (IMAP_CLIENT: Imap) =>
    new Promise<Imap.Box>((resolve, reject) => {
        IMAP_CLIENT.openBox('INBOX', true, (err, box) => {
            if (err) reject(err);
            else resolve(box);
        });
    });

export default imap_getPaginatedMails;