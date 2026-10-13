export const number = (value:number,places=2) => new Intl.NumberFormat("id-ID",{minimumFractionDigits:places,maximumFractionDigits:places}).format(value);
export const time = (value:string|null) => value?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"—";
export const names:Record<string,string> = {"ES-01":"Embedded System","SC-02":"Sistem Cerdas","JDF-03":"Jaringan & Digital Forensik"};
export const descriptions:Record<string,string> = {"ES-01":"Perangkat keras, mikrokontroler, IoT, sistem tertanam, dan robotika.","SC-02":"Kecerdasan buatan, machine learning, visi komputer, dan pengolahan data.","JDF-03":"Jaringan komputer, keamanan siber, dan analisis forensik digital."};
export const icons:Record<string,string> = {"ES-01":"aab2d.svg","SC-02":"6f02e.svg","JDF-03":"9d2a9.svg"};
