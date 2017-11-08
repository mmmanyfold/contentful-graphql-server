/* eslint-disable no-console */

import cfGraphql from 'cf-graphql';
import express from 'express';
import cors from 'cors';
import graphqlHTTP from 'express-graphql';

const port = process.env.PORT || 4000;

const aboutSpaceId = '1xeolmvll2k7';
const mediaSpaceId = '970rl7t29lr8';
const peopleSpaceId = 'jvc74n2b996o';

const cdaToken = process.env.TMHAS_CONTENTFUL_CDA_TOKEN;
const cmaToken = process.env.THMAS_CONTENTFUL_CMA_TOKEN;

if (aboutSpaceId && mediaSpaceId && peopleSpaceId && cdaToken && cmaToken) {
    console.log('Space IDs, CDA token and CMA token provided');
    console.log(`Fetching space (${[aboutSpaceId, mediaSpaceId, peopleSpaceId]}) content types to create a space graph`);
    useProvidedSpaces([aboutSpaceId, mediaSpaceId, peopleSpaceId]);
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

    const [ aboutSpaceId, mediaSpaceId , peopleSpaceId ] = spaceIds;
    const [ aboutToken, mediaToken, peopleToken ] = cdaToken.split(' ');

    const aboutClient = cfGraphql.createClient({ spaceId: aboutSpaceId, cdaToken: aboutToken, cmaToken });
    const mediaClient = cfGraphql.createClient({ spaceId: mediaSpaceId, cdaToken: mediaToken, cmaToken });
    const peopleClient = cfGraphql.createClient({ spaceId: peopleSpaceId, cdaToken: peopleToken, cmaToken });

    Promise.all([
        schemaBuilder(aboutClient),
        schemaBuilder(mediaClient),
        schemaBuilder(peopleClient),
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

    const [ aboutClient, mediaClient, peopleClient ] = clients;
    const [ aboutSchema, mediaSchema, peopleSchema ] = schemas;

    const app = express();

    app.use(cors());

    const aboutUI = cfGraphql.helpers.graphiql({
        title: 'contentful<->graphql | about space',
        url: '/graphql/about',
    });

    const mediaUI = cfGraphql.helpers.graphiql({
        title: 'contentful<->graphql | media space',
        url: '/graphql/media',
    });

    const peopleUI = cfGraphql.helpers.graphiql({
        title: 'contentful<->graphql | people space',
        url: '/graphql/people',
    });

    app.get('/about', (_, res) => res.set(aboutUI.headers).status(aboutUI.statusCode).end(aboutUI.body));
    app.get('/media', (_, res) => res.set(mediaUI.headers).status(mediaUI.statusCode).end(mediaUI.body));
    app.get('/people', (_, res) => res.set(peopleUI.headers).status(peopleUI.statusCode).end(peopleUI.body));

    const opts = {
        version: true,
        timeline: false,
        detailedErrors: false,
    };

    const aboutExt = cfGraphql.helpers.expressGraphqlExtension(aboutClient , aboutSchema, opts);
    const mediaExt = cfGraphql.helpers.expressGraphqlExtension(mediaClient, mediaSchema, opts);
    const peopleExt = cfGraphql.helpers.expressGraphqlExtension(peopleClient, peopleSchema, opts);

    app.use('/graphql/about', graphqlHTTP(aboutExt));
    app.use('/graphql/media', graphqlHTTP(mediaExt));
    app.use('/graphql/people', graphqlHTTP(peopleExt));

    app.listen(port);

    console.log('Running a GraphQL server!');
    console.log(`You can access GraphiQL at localhost:${port}`);
    console.log(`You can use the GraphQL endpoint at localhost:${port}/graphql/{about, media, people}`);
}

function fail(err) {
    console.log(err);
    process.exit(1);
}