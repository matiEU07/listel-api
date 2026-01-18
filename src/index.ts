import express from "express";
import cors from "cors";
import CONFIG from "./config";
import { pop3_getPaginatedMails } from "./pop3";
import { imap_getPaginatedMails } from "./imap";
import { gmail_getPaginatedMails, getGmailAuthUrl, getGmailTokens } from "./gmail";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: ["http://localhost:5173", "https://listel-api.tenco.waw.pl", "https://listel.tenco.waw.pl"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        exposedHeaders: ["Authorization"],
    })
);

app.get("/greet", (req, res) => {
    res.send("<h1>Hello</h1>")
})

// Gmail OAuth routes
app.get("/gmail/auth-url", (req, res) => {
    try {
        const authUrl = getGmailAuthUrl();
        res.json({ authUrl });
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).send({ error: "Failed to generate auth URL" });
    }
});

app.post("/gmail/callback", async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).send({ error: "Authorization code required" });
        }

        const tokens = await getGmailTokens(code);
        res.json(tokens);
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        res.status(500).send({ error: "Failed to get tokens" });
    }
});

// Updated endpoint to accept credentials via POST
app.post("/:protocol/receive/:pagination/:page/:order?", async (req, res) => {
    try {
        const protocol = req.params.protocol.toLowerCase();
        const pagination = parseInt(req.params.pagination);
        const page = parseInt(req.params.page);

        if (isNaN(pagination) || isNaN(page)) {
            return res.status(400).send("Invalid pagination or page number");
        }

        // Handle Gmail separately (uses OAuth tokens)
        if (protocol === "gmail") {
            const { accessToken, refreshToken, pageToken } = req.body;
            
            if (!accessToken || !refreshToken) {
                return res.status(400).send("Missing Gmail tokens");
            }

            const result = await gmail_getPaginatedMails(
                { accessToken, refreshToken, pageToken },
                pagination,
                page
            );
            res.send(result);
            return;
        }

        // Handle POP3/IMAP (uses email/password)
        const { email, password, host, port, tls } = req.body;

        if (!email || !password || !host) {
            return res.status(400).send("Missing required credentials");
        }

        const config = {
            user: email,
            password: password,
            host: host,
            port: port || (protocol === 'pop3' ? 995 : 993),
            tls: tls !== undefined ? tls : true
        };

        if (protocol === "pop3") {
            const mails = await pop3_getPaginatedMails(config, pagination, page);
            res.send(mails);
            return;
        }

        if (protocol === "imap") {
            const mails = await imap_getPaginatedMails(config, pagination, page);
            res.send(mails);
            return;
        }

        res.status(422).send("Bad mail protocol");
    } catch (error) {
        console.error('Error fetching mails:', error);
    res.status(500).send({ error: (error as Error)?.message || "Failed to fetch emails" });
    }
});

app.listen(CONFIG.EXPRESS.PORT, () => {
    console.log(`[⚡] Server is listening on port: ${CONFIG.EXPRESS.PORT}!`);
});