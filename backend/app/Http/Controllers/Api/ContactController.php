<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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

        $to = config('mail.from.address', 'firasbkacars@gmail.com');

        try {
            Mail::to($to)->send(new ContactMessage($validated));
        } catch (\Exception $e) {
            Log::error('Failed to send contact email', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Impossible d\'envoyer le message pour le moment.'], 500);
        }

        return response()->json(['message' => 'Message envoye avec succes'], 201);
    }
}
