# Contentful <=> GraphQL Integration Server

http://45.55.175.107:4000/graphql/about

http://45.55.175.107:4000/graphql/media

http://45.55.175.107:4000/graphql/people

### deving

```
npm i 
npm start
```

### setup

```
export TMHAS_CONTENTFUL_SPACE_ID=...
export TMHAS_CONTENTFUL_CDA_TOKEN=...
export THMAS_CONTENTFUL_CMA_TOKEN=...
```

### deploy

#### local
`now`

#### prod
`now -e THMAS_CONTENTFUL_CMA_TOKEN=${THMAS_CONTENTFUL_CMA_TOKEN} -e TMHAS_CONTENTFUL_CDA_TOKEN=${TMHAS_CONTENTFUL_CDA_TOKEN}`

