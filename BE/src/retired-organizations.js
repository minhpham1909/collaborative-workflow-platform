import express from 'express';
import {requireAuthentication,createRateLimiter} from './auth/http.js';
import {originPolicy,requestError} from './http/policy.js';
export function retiredOrganizationRouter(authService,config){
 const router=express.Router();router.use(originPolicy({webOrigin:config.webOrigin,methods:['GET','POST','PATCH']}));router.use(createRateLimiter());router.use(requireAuthentication(authService,{verified:true}));
 router.use((_req,res)=>res.status(410).json({error:{code:'ORGANIZATIONS_RETIRED'}}));router.use(requestError);return router;
}
