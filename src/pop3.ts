// pop3.ts
import Pop3Command from "node-pop3";
import { ParsedMail, simpleParser } from "mailparser";
import PQueue from "p-queue";

const popQueue = new PQueue({ concurrency: 5 });

interface Pop3Config {
    user: string;
    password: string;
    host: string;
    port?: number;
    tls: boolean;
}

export const pop3_getPaginatedMails = async (
    config: Pop3Config,
    pagination: number,
    page: number = 1
): Promise<ParsedMail[]> => {
    return popQueue.add(async () => {
        const pop3 = new Pop3Command({
            user: config.user,
            password: config.password,
            host: config.host,
            port: config.port,
            tls: config.tls
        });

        const [mailsNumStr] = (await pop3.STAT()).split(" ");
        const mailsNum = parseInt(mailsNumStr);

        const mails: ParsedMail[] = [];

        for (let i = mailsNum - (pagination * (page - 1)); i > 0 && i > mailsNum - (pagination * page); i--) {
            mails.push(await readMessage(pop3, i));
        }

        await pop3.QUIT();
        return mails;
    });
};

const readMessage = async (POP_3CLIENT: Pop3Command, msgNum: number): Promise<ParsedMail> => {
    const mailRaw = await POP_3CLIENT.RETR(msgNum);
    const mailParsed = simpleParser(mailRaw);
    return mailParsed;
};

export default readMessage;