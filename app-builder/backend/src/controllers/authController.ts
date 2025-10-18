import {AuthService} from '../services/AuthService.js';
import type { Request, Response } from 'express'; 


export class AuthController{
    private authService: AuthService;

    constructor(authService: AuthService){
        this.authService = authService;
    }


    public async login(req: Request, res: Response){
        try {
            const { username, password } = req.body;
            const token = await this.authService.login(username, password);
            res.json({ token });
        } catch (err: any) {
          res.status(401).json({ error: err.message });
        }
    }

    public async guest(req: Request, res: Response){
        try {
            const token = await this.authService.guest();
            res.json({ token });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }

    public async signup(req: Request, res: Response ) {
        try{
            const { username, email, password } = req.body;
            const token = await this.authService.signup(username, email, password);
            res.status(201).json({ token });
        }
        catch(err: any) {
            res.status(400).json({ error: err.message });

        }

    }
}