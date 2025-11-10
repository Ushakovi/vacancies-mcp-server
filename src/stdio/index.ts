import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
    name: 'vacancies-mcp-server',
    version: '1.0.0',
});

server.registerTool(
    'get_vacancies',
    {
        title: 'Получение всех вакансий.',
        description: 'Возвращает список всех вакансий. Можно передать фильтры',
        inputSchema: {
            searchText: z.string().describe('Поисковое слово'),
            salary: z.number().optional().describe('Размер заработной платы'),
            perPage: z
                .string()
                .optional()
                .describe('Количество элементов на странице'),
        },
    },
    async (req) => {
        const data = await fetch(
            `https://api.hh.ru/vacancies?area=1&text=${req.searchText}${
                req.perPage ? `&per_page=${req.perPage}` : ''
            }${req.salary ? `&salary=${req.salary}` : ''}`
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

const transport = new StdioServerTransport();
server.connect(transport);
