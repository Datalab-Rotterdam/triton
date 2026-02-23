export * from "./metadata.service"
export * from "./sensor.service"
export * from "./token.service"

import {MetadataService} from "./metadata.service";
import {SensorService} from "./sensor.service";
import {TokenService} from "./token.service";

export type TritonAPI =  MetadataService & SensorService & TokenService;
