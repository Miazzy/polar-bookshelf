// start a simple static HTTP server only listening on localhost

import {WebserverConfig} from './WebserverConfig';
import {FileRegistry} from './FileRegistry';
import {Logger} from '../../logger/Logger';
import {Preconditions} from '../../Preconditions';
import {Paths} from '../../util/Paths';

import express, {Express, RequestHandler} from 'express';
import serveStatic from 'serve-static';
import {ResourceRegistry} from './ResourceRegistry';
import * as http from "http";
import * as https from "https";
import {Capture} from '../../capture/Capture';
import {CaptureOpts} from '../../capture/CaptureOpts';
import {PathParams} from 'express-serve-static-core';

const log = Logger.create();

export class Webserver implements WebRequestHandler {

    private readonly webserverConfig: WebserverConfig;
    private readonly fileRegistry: FileRegistry;
    private readonly resourceRegistry: ResourceRegistry;

    private app?: Express;
    private server?: http.Server | https.Server;

    constructor(webserverConfig: WebserverConfig,
                fileRegistry: FileRegistry,
                resourceRegistry: ResourceRegistry = new ResourceRegistry()) {

        this.webserverConfig = Preconditions.assertNotNull(webserverConfig, "webserverConfig");
        this.fileRegistry = Preconditions.assertNotNull(fileRegistry, "fileRegistry");
        this.resourceRegistry = resourceRegistry;

    }

    public async start(): Promise<void> {

        log.info("Running with config: ", this.webserverConfig);

        express.static.mime.define({ 'text/html': ['chtml'] });

        this.app = express();

        this.app.use(serveStatic(this.webserverConfig.dir));
        this.app.use(express.json());
        this.app.use(express.urlencoded());

        this.registerFilesHandler();
        this.registerResourcesHandler();

        if (this.webserverConfig.useSSL) {

            const sslConfig = {
                key: this.webserverConfig.ssl!.key,
                cert: this.webserverConfig.ssl!.cert
            };

            this.server =
                https.createServer(sslConfig, this.app)
                    .listen(this.webserverConfig.port, this.webserverConfig.host);

        } else {

            this.server =
                http.createServer(this.app)
                    .listen(this.webserverConfig.port, this.webserverConfig.host);

        }

        // await for listening...

        return new Promise<void>(resolve => {
            this.server!.once('listening', () => resolve());
        });

        // log.info(`Webserver up and running on port
        // ${this.webserverConfig.port} with config: `, this.webserverConfig);

    }

    public stop() {

        log.info("Stopping...");
        this.server!.close();
        log.info("Stopping...done");
    }

    public get(type: PathParams, ...handlers: RequestHandler[]): void {
        this.app!.get(type, ...handlers);
    }

    public options(type: PathParams, ...handlers: RequestHandler[]): void {
        this.app!.options(type, ...handlers);
    }

    public post(type: PathParams, ...handlers: RequestHandler[]): void {
        this.app!.post(type, ...handlers);
    }

    public put(type: PathParams, ...handlers: RequestHandler[]): void {
        this.app!.put(type, ...handlers);
    }

    private registerFilesHandler() {

        this.app!.get(/files\/.*/, (req: express.Request, res: express.Response) => {

            try {

                log.info("Handling file at path: " + req.path);

                const hashcode = Paths.basename(req.path);

                if (!hashcode) {
                    const msg = "No key given for /file";
                    log.error(msg);
                    res.status(404).send(msg);
                } else if (!this.fileRegistry.hasKey(hashcode)) {
                    const msg = "File not found with hashcode: " + hashcode;
                    log.error(msg);
                    res.status(404).send(msg);
                } else {

                    const keyMeta = this.fileRegistry.get(hashcode);
                    const filename = keyMeta.filename;

                    log.info(`Serving file at ${req.path} from ${filename}`);

                    return res.sendFile(filename);

                }

            } catch (e) {
                log.error(`Could not handle serving file. (req.path=${req.path})`, e);
            }

        });

    }

    private registerResourcesHandler() {

        this.app!.get(/.*/, (req: express.Request, res: express.Response) => {

            try {

                log.info("Handling resource at path: " + req.path);

                if (!this.resourceRegistry.contains(req.path)) {
                    const msg = "Resource not found: " + req.path;
                    log.error(msg);
                    res.status(404).send(msg);
                } else {

                    const filePath = this.resourceRegistry.get(req.path);
                    return res.sendFile(filePath);

                }

            } catch (e) {
                log.error(`Could not handle serving file. (req.path=${req.path})`, e);
            }

        });

    }

}

export interface WebRequestHandler {

    get(type: PathParams, ...handlers: RequestHandler[]): void;
    options(type: PathParams, ...handlers: RequestHandler[]): void;
    post(type: PathParams, ...handlers: RequestHandler[]): void;
    put(type: PathParams, ...handlers: RequestHandler[]): void;

}
