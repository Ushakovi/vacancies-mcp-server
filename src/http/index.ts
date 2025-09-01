import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

const app = express();
app.use(express.json());
app.use(
    cors({
        origin: '*',
        allowedHeaders: '*',
        exposedHeaders: ['Mcp-Session-Id'],
    })
);

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
                transports[sessionId] = transport;
            },
        });

        transport.onclose = () => {
            if (transport.sessionId) {
                delete transports[transport.sessionId];
            }
        };

        const server = new McpServer({
            name: 'users-mcp-server',
            version: '1.0.0',
        });

        server.registerTool(
            'get_vacancies',
            {
                title: 'Получение всех вакансий',
                description: 'Возвращает список всех вакансий.',
                inputSchema: {},
            },
            async () => {
                const data = await fetch('https://api.hh.ru/vacancies?area=1');
                const vacancies = await data.json();

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(vacancies),
                        },
                    ],
                };
            }
        );

        server.registerTool(
            'get_vacancies_by_search_word',
            {
                title: 'Получение всех вакансий по поисковому слову',
                description:
                    'Возвращает список всех вакансий по поисковому слову. Можно передать количество элементов',
                inputSchema: {
                    searchText: z.string(),
                    perPage: z.number().optional(),
                },
            },
            async (req) => {
                const data = await fetch(
                    `https://api.hh.ru/vacancies?area=1&text=${req.searchText}${
                        req.perPage ? `&per_page=${req.perPage}` : ''
                    }`
                );
                const vacancies = await data.json();

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(vacancies),
                        },
                    ],
                };
            }
        );

        await server.connect(transport);
    } else {
        res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
            },
            id: null,
        });
        return;
    }

    await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (
    req: express.Request,
    res: express.Response
) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};

app.get('/mcp', handleSessionRequest);
app.delete('/mcp', handleSessionRequest);
app.listen(8081);
