import { Nullable } from "../types/nullable";
import { SourceTypes } from "./sourceTypes";

export class Module  {
    constructor (source: string, name: string, location: string, sourceType: Nullable<SourceTypes>, modifiedSourceType: Nullable<string>){
        this.source = source;
        this.name = name;
        this.location = location;
        this.sourceType = sourceType;
        this.modifiedSourceType = modifiedSourceType;
    }
    public source: string = '';
    public name: string = '';
    public location: string = ''
    public sourceType: Nullable<SourceTypes> = null
    public modifiedSourceType: Nullable<string> = null
}