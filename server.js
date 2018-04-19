/* eslint-disable no-console */

import cfGraphql from 'cf-graphql';
import express from 'express';
import cors from 'cors';
import graphqlHTTP from 'express-graphql';

const port = process.env.PORT || 4000;

const electionSpaceId = '0gtzstczow4j';

const cdaToken = process.env.TMHAS_CONTENTFUL_CDA_TOKEN;
const cmaToken = process.env.THMAS_CONTENTFUL_CMA_TOKEN;

if (electionSpaceId && cdaToken && cmaToken) {
    console.log('Space IDs, CDA token and CMA token provided');
    console.log(`Fetching space (${[electionSpaceId]}) content types to create a space graph`);
    useProvidedSpaces([electionSpaceId]);
} else {
    fail('Error: No Space IDs, CDA token or CMA token provided, exiting...');
}

// this function implements a flow you could use in your application:

// 1. fetch content types
// 2. prepare a space graph
// 3. create a schema out of the space graph
// 4. run a server

function schemaBuilder(client) {
    return new Promise((resolve, reject) => {
        return client.getContentTypes()
            .then(cfGraphql.prepareSpaceGraph)
            .then(spaceGraph => {
                const names = spaceGraph.map(ct => ct.names.type).join(', ');
                console.log(`Contentful content types prepared: ${names}`);
                return spaceGraph;
            })
            .then(cfGraphql.createSchema)
            .then(schema => resolve([client, schema]))
            .catch(reject);
    });
}

function useProvidedSpaces(spaceIds) {

    const [ electionSpaceId ] = spaceIds;
    const [ electionToken ] = cdaToken.split(' ');

    const electionClient = cfGraphql.createClient({ spaceId: electionSpaceId, cdaToken: electionToken, cmaToken });

    Promise.all([
        schemaBuilder(electionClient),
    ]).then(all => {
        const clients = [];
        const schemas = [];
        all.map(([client, schema]) => {
            clients.push(client);
            schemas.push(schema);
        });
        startServer(clients, schemas);
    }).catch(fail);
}

function startServer(clients, schemas) {

    const [ electionClient ] = clients;
    const [ electionSchema ] = schemas;

    const app = express();

    app.use(cors());

    const electionUI = cfGraphql.helpers.graphiql({
        title: 'contentful<->graphql | elections space',
        url: '/graphql/election',
    });



    app.get('/election', (_, res) => res.set(electionUI.headers).status(electionUI.statusCode).end(electionUI.body));

    const opts = {
        version: true,
        timeline: false,
        detailedErrors: false,
    };

    const electionExt = cfGraphql.helpers.expressGraphqlExtension(electionClient , electionSchema, opts);

    app.use('/graphql/about', graphqlHTTP(electionExt));

    app.listen(port);

    console.log('Running a GraphQL server!');
    console.log(`You can access GraphiQL at localhost:${port}`);
    console.log(`You can use the GraphQL endpoint at http://localhost:${port}/graphql/election`);
}

function fail(err) {
    console.log(err);
    process.exit(1);
}