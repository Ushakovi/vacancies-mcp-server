import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

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

const transport = new StdioServerTransport();
server.connect(transport);
