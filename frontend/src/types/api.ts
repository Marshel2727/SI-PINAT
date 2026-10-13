export type Row = Record<string, any>;
export type Specialization = {id:string;code:string;name:string;description:string|null};
export type Assessment = Row & {public_id:string;mode:"FULL"|"DEMO";status:string;model_version:string;current_semester:number;student:Row|null;preferred_specialization_code:string|null;progress:{total:number;answered:number;user:number;example:number}};
export type Score = Row & {specialization_code:string;specialization_name:string;academic_score:number;competency_score:number;suitability_score:number;rank_position:number;reason:string};
export type Result = Row & {mode:"DEMO"|"FULL";scores:Score[];top_specialization_codes:string[];has_tie:boolean;model_version:string;engine_version:string;answer_sources:{USER:number;EXAMPLE:number}};
export type Envelope<T> = {data:T;meta?:{page:number;page_size:number;total:number;total_pages:number}};
