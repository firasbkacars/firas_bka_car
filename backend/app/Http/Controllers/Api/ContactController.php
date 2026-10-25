<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ContactMessage;
use App\Support\QueuedMail;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|min:2|max:255',
            'contact' => 'required|string|min:5|max:255',
            'sujet' => 'required|string|min:2|max:255',
            'message' => 'required|string|min:5|max:2000',
        ]);

        $to = config('mail.admin_address');

        // Le message du visiteur est accepte quoi qu'il arrive : un envoi
        // synchrone retournait un 500 au visiteur des que SMTP n'etait pas
        // configure (cas de production actuel, MAIL_MAILER=log).
        QueuedMail::send($to, new ContactMessage($validated), 'contact');

        return response()->json(['message' => 'Message envoye avec succes'], 201);
    }
}
