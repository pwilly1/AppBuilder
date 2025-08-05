import {AuthService} from '../services/AuthService';
import type { Request, Response } from 'express'; 


export class authController{
    private authService: AuthService;

    constructor(authService: AuthService){
        this.authService = authService;
    }


    public async login(req: Request, res: Response){
        const { username, email, password } = req.body;
        
        return this.authService.login(username, password);

    }

    public async signup(req: Request, res: Response ) {
        const { username, email, password } = req.body;
        
        token = await this.authService.signup(username, email, password);
    }
}