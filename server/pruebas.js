let j = [1,1];
async function change(){
    j[0] = 1;
    
}
async function change2(){
    j[1]=2;
    change();
}
async function hola(){
    
    await change2();
    console.log(j)
}

async function verify (func) {
    for (i=1;i<10;i++){
        console.log(i)
        if (i===2){
            return
        }
    }
    
}
//verify()

async function  argumentos (task,arguments){
    console.log(await task(arguments))
}

async function pruebaa ([h,j]){
    return h+j
}

async function pruebaaa ([h,j,i]){
    return h+j+i
}

// argumentos(pruebaa,['1','2'])
// argumentos(pruebaaa,['1','2','3'])
// const bye = {name: 'jhon', apellido: 'Amays'
// }
// bye['name']='Paula'
// console.log(bye['name'])
// const nodemailer = require("nodemailer");
// const transporter = nodemailer.createTransport({
//     service: "hotmail",
//     host: 'smtp-mail.outlook.com',
//     //host: 'smtp.gmail.com',
//     port: 587,//465,
//     secure: false,
//     auth: {
//         user: 'pruebawebscraping@hotmail.com',//'jhonamaya18@hotmail.com',
//         pass: 'scrapeando123',//deadhunter3@%',
//     },
//   });

// const mailOptions = {
// from: 'pruebawebscraping@hotmail.com',
// to: 'jhonamaya18@hotmail.com',
// subject: 'Error in web scraping code',
// text: 'That was easy!'
// };

// mailOptions['text']='No existe selector'
// transporter.sendMail(mailOptions, function(error, info){
//     if (error) {
//         console.log('Error:'+error);
//     } else {
//         console.log('Email sent: ' + info.response);
//     }
//     });

console.log('hola'.slice(0,-2))