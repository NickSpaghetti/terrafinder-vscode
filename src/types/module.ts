import { SourceTypes } from "../models/sourceTypes"
import { Nullable } from "./nullable"

export type Module = {
    source: string
    name: string
    location: string
    sourceType: Nullable<SourceTypes>
    modifiedSourceType: Nullable<string>
}