import jwt from 'express-jwt';
import jwtAuthz from 'express-jwt-authz';
import jwksRsa from 'jwks-rsa';

export const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        jwksUri: 'https://slatecx.us.auth0.com/.well-known/jwks.json'
    }),
    audience: 'https://api.slate.cx',
    issuer: 'https://slatecx.us.auth0.com/',
    algorithms: ['RS256']
});
